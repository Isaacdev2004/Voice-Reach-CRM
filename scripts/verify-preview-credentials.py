#!/usr/bin/env python3
"""Read-only operator verifier. No dotenv loading, SDK logging, or live probes by default."""

import base64
import getpass
import json
import re
import ssl
import sys
import urllib.error
import urllib.request
import warnings


STAGING_REF = "jojgdfpmaxvbhobjrsbm"
STAGING_URL = f"https://{STAGING_REF}.supabase.co"
CLERK_JWKS = "https://api.clerk.com/v1/jwks"
SUPABASE_PROBE = f"{STAGING_URL}/auth/v1/admin/users?page=1&per_page=1"
MAX_INPUT = 8192
MAX_JWKS = 65536
INPUT_NAMES = (
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
)
CHECKS = (
    "clerk_publishable_format",
    "clerk_secret_format",
    "staging_supabase_url",
    "staging_service_role_format",
    "clerk_secret_authenticated",
    "clerk_same_instance",
    "staging_service_role_authenticated",
)
PLACEHOLDER = re.compile(r"replace[_-]?me|paste[_-]?full|placeholder|redacted|changeme|your[_-]|\.\.\.", re.I)


def plain(value):
    return (isinstance(value, str) and 0 < len(value) <= MAX_INPUT
            and re.fullmatch(r"[\x21-\x7e]+", value) is not None
            and not PLACEHOLDER.search(value))


def decode_base64(value, urlsafe=False):
    """Require canonical encoding; never repair a truncated credential."""
    alphabet = r"[A-Za-z0-9_-]+" if urlsafe else r"[A-Za-z0-9+/]+={0,2}"
    if not isinstance(value, str) or not re.fullmatch(alphabet, value):
        raise ValueError()
    unpadded = value.rstrip("=")
    decoded = base64.b64decode(unpadded + "=" * (-len(unpadded) % 4),
                               altchars=b"-_" if urlsafe else None, validate=True)
    encoded = (base64.urlsafe_b64encode(decoded) if urlsafe else base64.b64encode(decoded)).decode("ascii")
    if value not in (encoded, encoded.rstrip("=")):
        raise ValueError()
    return decoded


def clerk_host(value):
    if not plain(value) or not value.startswith("pk_test_"):
        raise ValueError()
    decoded = decode_base64(value[8:]).decode("ascii")
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.clerk\.accounts\.dev\$", decoded):
        raise ValueError()
    return decoded[:-1]


def clerk_secret_format(value):
    # The suffix is opaque. Only the authenticated API probe can establish validity.
    return plain(value) and re.fullmatch(r"sk_test_[A-Za-z0-9]+", value) is not None


def service_role_format(value):
    if not plain(value):
        return False
    if re.fullmatch(r"sb_secret_[A-Za-z0-9_-]+", value):
        return True
    try:
        header, payload, signature = value.split(".")
        header = json.loads(decode_base64(header, True))
        payload = json.loads(decode_base64(payload, True))
        return (isinstance(header, dict) and header.get("alg") == "HS256"
                and isinstance(payload, dict) and payload.get("role") == "service_role"
                and payload.get("ref") == STAGING_REF
                and len(decode_base64(signature, True)) == 32)
    except (ValueError, TypeError, UnicodeError):
        return False


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read_only_get(url, headers, read_jwks):
    """Only callers below choose destinations. Never retain Supabase response data."""
    try:
        # Unlike create_default_context(), this does not enable SSLKEYLOGFILE.
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.load_default_certs()
        opener = urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=context))
        request = urllib.request.Request(url, method="GET", headers={"Accept": "application/json", **headers})
        with opener.open(request, timeout=10) as response:
            if response.status != 200:
                return "UNVERIFIED", None
            if not read_jwks:
                return "PASS", None
            body = response.read(MAX_JWKS + 1)
            if len(body) > MAX_JWKS:
                return "UNVERIFIED", None
            return "PASS", json.loads(body)
    except urllib.error.HTTPError as error:
        status = "FAIL" if error.code in (401, 403) else "UNVERIFIED"
        error.close()
        return status, None
    except Exception:
        # Includes malformed JSON, TLS/network errors and timeouts. No raw messages.
        return "UNVERIFIED", None


def rsa_keys(document):
    """Compare signing material, never kid alone. Accept overlapping rotation keys."""
    result = set()
    if not isinstance(document, dict) or not isinstance(document.get("keys"), list):
        return result
    for key in document["keys"]:
        if not isinstance(key, dict) or key.get("kty") != "RSA":
            continue
        if key.get("use", "sig") != "sig" or key.get("alg", "RS256") != "RS256":
            continue
        try:
            modulus = decode_base64(key.get("n"), True)
            exponent = decode_base64(key.get("e"), True)
            if (2048 <= int.from_bytes(modulus, "big").bit_length() <= 8192
                    and int.from_bytes(exponent, "big") >= 3
                    and int.from_bytes(exponent, "big") % 2 == 1):
                result.add((modulus, exponent))
        except (ValueError, TypeError):
            continue
    return result


def format_status(value, validator):
    if value is None or value == "":
        return "UNVERIFIED"
    try:
        return "PASS" if validator(value) else "FAIL"
    except (ValueError, TypeError, UnicodeError):
        return "FAIL"


def verify_credentials(values, probe=False, request=None):
    results = dict.fromkeys(CHECKS, "UNVERIFIED")
    pk, sk, url, service = (values.get(name) for name in INPUT_NAMES)
    results["clerk_publishable_format"] = format_status(pk, clerk_host)
    results["clerk_secret_format"] = format_status(sk, clerk_secret_format)
    results["staging_supabase_url"] = format_status(url, lambda value: value == STAGING_URL)
    results["staging_service_role_format"] = format_status(service, service_role_format)
    # Missing protected exports do not imply invalid saved Vercel credentials.
    # No provider receives any request unless every input passes local validation.
    if not probe or any(results[name] != "PASS" for name in CHECKS[:4]):
        return results
    request = request or read_only_get
    backend_status, backend = request(CLERK_JWKS, {"Authorization": f"Bearer {sk}"}, True)
    backend_keys = rsa_keys(backend)
    results["clerk_secret_authenticated"] = (
        "UNVERIFIED" if backend_status == "PASS" and not backend_keys else backend_status
    )
    if results["clerk_secret_authenticated"] == "PASS":
        frontend_status, frontend = request(f"https://{clerk_host(pk)}/.well-known/jwks.json", {}, True)
        frontend_keys = rsa_keys(frontend)
        if frontend_status == "PASS" and frontend_keys:
            results["clerk_same_instance"] = "PASS" if backend_keys & frontend_keys else "FAIL"
        else:
            results["clerk_same_instance"] = "UNVERIFIED"
    headers = {"apikey": service}
    if not service.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {service}"
    results["staging_service_role_authenticated"], _ = request(SUPABASE_PROBE, headers, False)
    return results


def read_inputs():
    # Never fall back to echoed input, environment exports, files, or command arguments.
    if not sys.stdin.isatty() or not sys.stderr.isatty():
        raise ValueError()
    with warnings.catch_warnings():
        warnings.simplefilter("error", getpass.GetPassWarning)
        return {name: getpass.getpass(f"{name} (hidden): ") for name in INPUT_NAMES}


def main(argv=None):
    results = dict.fromkeys(CHECKS, "UNVERIFIED")
    try:
        args = sys.argv[1:] if argv is None else argv
        if args in ([], ["--probe"]):
            results = verify_credentials(read_inputs(), probe=args == ["--probe"])
    except (Exception, KeyboardInterrupt):
        pass
    overall = ("FAIL" if "FAIL" in results.values() else
               "PASS" if all(value == "PASS" for value in results.values()) else "UNVERIFIED")
    print(json.dumps({**results, "credential_verification": overall,
                      "nine_effective_preview_checks": "UNVERIFIED"}))
    return 0 if overall == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
