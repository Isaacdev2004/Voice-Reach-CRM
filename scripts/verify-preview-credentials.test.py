"""Synthetic-only tests. Socket access is forbidden; no saved credentials are read."""

import base64
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import pty
import select
import ssl
import subprocess
import sys
import time
import unittest
from unittest.mock import Mock, patch
import urllib.error
import warnings

sys.dont_write_bytecode = True
SCRIPT = Path(__file__).with_name("verify-preview-credentials.py")
spec = importlib.util.spec_from_file_location("credential_verifier", SCRIPT)
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


def b64(value):
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def publishable(host="synthetic-qa.clerk.accounts.dev$"):
    return "pk_test_" + base64.b64encode(host.encode()).decode().rstrip("=")


def service_jwt(role="service_role", ref=verifier.STAGING_REF, alg="HS256"):
    return ".".join((b64(json.dumps({"alg": alg}).encode()),
                     b64(json.dumps({"role": role, "ref": ref}).encode()), b64(b"S" * 32)))


def inputs():
    return dict(zip(verifier.INPUT_NAMES, (
        publishable(), "sk_test_" + "a1B2" * 12, verifier.STAGING_URL,
        "sb_secret_" + "C3d4" * 12,
    )))


def jwks(byte=145, kid="same-test-kid"):
    return {"keys": [{"kty": "RSA", "alg": "RS256", "use": "sig", "kid": kid,
                      "n": b64(bytes([byte]) * 256), "e": "AQAB"}]}


class Response:
    def __init__(self, body=b"", status=200):
        self.status = status
        self.read = Mock(return_value=body)
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.closed = True


class CredentialVerifierTests(unittest.TestCase):
    def setUp(self):
        # A missing transport mock must fail the test, never reach a live service.
        for target in ("socket.create_connection", "socket.socket.connect", "socket.socket.connect_ex"):
            guard = patch(target, side_effect=AssertionError("Network forbidden in synthetic tests"))
            mocked = guard.start()
            self.addCleanup(guard.stop)
            self.addCleanup(mocked.assert_not_called)

    def render(self, args, values=None, request=None, input_error=None):
        output = io.StringIO()
        with patch.object(verifier, "read_inputs", return_value=values, side_effect=input_error), \
                patch.object(verifier, "read_only_get", request or Mock()), \
                contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            code = verifier.main(args)
        raw = output.getvalue()
        result = json.loads(raw)
        self.assertEqual(set(result), set(verifier.CHECKS) | {"credential_verification", "nine_effective_preview_checks"})
        self.assertTrue(set(result.values()) <= {"PASS", "FAIL", "UNVERIFIED"})
        self.assertEqual(result["nine_effective_preview_checks"], "UNVERIFIED")
        for value in (values or {}).values():
            if value:
                self.assertNotIn(value, raw)
        return code, result, raw

    def test_default_format_only_never_probes_or_claims_completeness(self):
        request = Mock()
        code, result, _ = self.render([], inputs(), request)
        request.assert_not_called()
        self.assertEqual(code, 1)
        self.assertEqual(result["clerk_secret_format"], "PASS")
        self.assertEqual(result["credential_verification"], "UNVERIFIED")

    def test_missing_and_protected_empty_credentials_stop_every_probe(self):
        for name in verifier.INPUT_NAMES:
            for value in (None, ""):
                with self.subTest(name=name, missing=value is None):
                    values = inputs()
                    values[name] = value
                    request = Mock()
                    code, result, _ = self.render(["--probe"], values, request)
                    request.assert_not_called()
                    self.assertEqual(code, 1)
                    self.assertEqual(result["credential_verification"], "UNVERIFIED")

    def test_rejects_unsafe_publishable_hosts_and_encoding_before_network(self):
        bad = ["pk_live_" + publishable()[8:], publishable() + "!", publishable() + "==="]
        bad += [publishable(host) for host in (
            "synthetic-qa.clerk.accounts.dev", "synthetic-qa.clerk.accounts.dev$$",
            "synthetic-qa.clerk.accounts.dev.evil.invalid$", "user@synthetic-qa.clerk.accounts.dev$",
            "synthetic-qa.clerk.accounts.dev:443$", "synthetic-qa.clerk.accounts.dev/path$",
            "synthetic-qa.clerk.accounts.dev?x=1$", "127.0.0.1$", "-bad.clerk.accounts.dev$",
            "nested.host.clerk.accounts.dev$", "synthetic\u2026.clerk.accounts.dev$",
        )]
        for value in bad:
            with self.subTest(case=bad.index(value)):
                values = inputs()
                values[verifier.INPUT_NAMES[0]] = value
                request = Mock()
                result = verifier.verify_credentials(values, True, request)
                self.assertEqual(result["clerk_publishable_format"], "FAIL")
                request.assert_not_called()

    def test_malformed_secret_characters_and_placeholders_stop_every_probe(self):
        bad = ["sk_live_validLooking", "sk_test_", "sk_test_placeholder", "sk_test_REDACTED"]
        bad += [inputs()[verifier.INPUT_NAMES[1]] + suffix for suffix in
                ("\u2026", "...", "\u200b", "\u00e9", " ", "\n", "\r", "\t", "\x00", "\x7f", "*", "<key>", "[key]", "=", "a" * 8192)]
        for index, value in enumerate(bad):
            with self.subTest(case=index):
                values = inputs()
                values[verifier.INPUT_NAMES[1]] = value
                request = Mock()
                result = verifier.verify_credentials(values, True, request)
                self.assertEqual(result["clerk_secret_format"], "FAIL")
                request.assert_not_called()

    def test_wrong_staging_url_blocks_all_requests(self):
        for value in (verifier.STAGING_URL + "/", verifier.STAGING_URL + ":443",
                      verifier.STAGING_URL + "?x=1", "https://another.supabase.co",
                      verifier.STAGING_URL.replace("https:", "http:")):
            values = inputs()
            values[verifier.INPUT_NAMES[2]] = value
            request = Mock()
            result = verifier.verify_credentials(values, True, request)
            self.assertEqual(result["staging_supabase_url"], "FAIL")
            request.assert_not_called()

    def test_legacy_service_role_claims_and_signature_shape_are_checked(self):
        self.assertTrue(verifier.service_role_format(service_jwt()))
        for value in (service_jwt(role="anon"), service_jwt(ref="wrong-project"),
                      service_jwt(alg="none"), service_jwt()[:-2], "sb_secret_REDACTED",
                      "sb_publishable_abcdef", "sb_secret_abc\u2026", "a.b.c"):
            self.assertFalse(verifier.service_role_format(value))

    def test_success_routes_credentials_only_to_approved_endpoints(self):
        request = Mock(side_effect=[("PASS", jwks()), ("PASS", jwks()), ("PASS", None)])
        values = inputs()
        code, result, _ = self.render(["--probe"], values, request)
        self.assertEqual(code, 0)
        self.assertEqual(result["credential_verification"], "PASS")
        self.assertEqual(request.call_args_list[0].args,
                         (verifier.CLERK_JWKS, {"Authorization": "Bearer " + values[verifier.INPUT_NAMES[1]]}, True))
        self.assertEqual(request.call_args_list[1].args,
                         ("https://synthetic-qa.clerk.accounts.dev/.well-known/jwks.json", {}, True))
        self.assertEqual(request.call_args_list[2].args,
                         (verifier.SUPABASE_PROBE, {"apikey": values[verifier.INPUT_NAMES[3]]}, False))

    def test_legacy_service_role_uses_bearer_and_apikey(self):
        values = inputs()
        values[verifier.INPUT_NAMES[3]] = service_jwt()
        request = Mock(side_effect=[("PASS", jwks()), ("PASS", jwks()), ("PASS", None)])
        verifier.verify_credentials(values, True, request)
        headers = request.call_args_list[-1].args[1]
        self.assertEqual(headers, {"apikey": service_jwt(), "Authorization": "Bearer " + service_jwt()})

    def test_matching_kid_is_not_same_instance_proof(self):
        request = Mock(side_effect=[("PASS", jwks()), ("PASS", jwks(147)), ("PASS", None)])
        code, result, _ = self.render(["--probe"], inputs(), request)
        self.assertEqual(code, 1)
        self.assertEqual(result["clerk_same_instance"], "FAIL")

    def test_rotated_keys_can_have_different_ids_with_matching_material(self):
        rotated = {"keys": jwks(147)["keys"] + jwks(kid="new-id")["keys"]}
        request = Mock(side_effect=[("PASS", jwks()), ("PASS", rotated), ("PASS", None)])
        self.assertEqual(verifier.verify_credentials(inputs(), True, request)["clerk_same_instance"], "PASS")

    def test_auth_rejection_fails_without_frontend_probe(self):
        request = Mock(side_effect=[("FAIL", None), ("PASS", None)])
        code, result, _ = self.render(["--probe"], inputs(), request)
        self.assertEqual(code, 1)
        self.assertEqual(result["clerk_secret_authenticated"], "FAIL")
        self.assertEqual(result["clerk_same_instance"], "UNVERIFIED")
        self.assertEqual(request.call_count, 2)

    def test_rejected_staging_admin_credential_prevents_overall_pass(self):
        request = Mock(side_effect=[("PASS", jwks()), ("PASS", jwks()), ("FAIL", None)])
        code, result, _ = self.render(["--probe"], inputs(), request)
        self.assertEqual(code, 1)
        self.assertEqual(result["staging_service_role_authenticated"], "FAIL")
        self.assertEqual(result["credential_verification"], "FAIL")

    def test_unusable_backend_or_frontend_jwks_remain_unverified(self):
        for bad in (None, {}, {"keys": []}, {"keys": "bad"}, jwks(byte=1),
                    {"keys": [{"kty": "RSA", "n": "not-valid!", "e": "AQAB"}]}):
            for backend in (True, False):
                responses = ([("PASS", bad), ("PASS", None)] if backend else
                             [("PASS", jwks()), ("PASS", bad), ("PASS", None)])
                request = Mock(side_effect=responses)
                result = verifier.verify_credentials(inputs(), True, request)
                self.assertEqual(result["clerk_same_instance"], "UNVERIFIED")

    def test_http_errors_do_not_read_or_print_response_bodies(self):
        for status in (301, 302, 307, 308, 400, 401, 403, 404, 429, 500):
            body = Mock()
            error = urllib.error.HTTPError(verifier.CLERK_JWKS, status, "PRIVATE_ERROR_SENTINEL", {}, body)
            opener = Mock()
            opener.open.side_effect = error
            with patch.object(verifier.urllib.request, "build_opener", return_value=opener):
                result, document = verifier.read_only_get(verifier.CLERK_JWKS, {}, True)
            self.assertEqual(result, "FAIL" if status in (401, 403) else "UNVERIFIED")
            self.assertIsNone(document)
            body.read.assert_not_called()

    def test_transport_get_tls_timeout_and_supabase_body_discard(self):
        response = Response()
        response.read.side_effect = AssertionError("User body must never be read")
        opener = Mock()
        opener.open.return_value = response
        with patch.object(verifier.urllib.request, "build_opener", return_value=opener) as build, \
                patch.dict(os.environ, {"SSLKEYLOGFILE": "/invalid/synthetic-must-not-be-written"}):
            result = verifier.read_only_get(verifier.SUPABASE_PROBE, {"apikey": "synthetic"}, False)
        self.assertEqual(result, ("PASS", None))
        self.assertTrue(response.closed)
        response.read.assert_not_called()
        request = opener.open.call_args.args[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertIsNone(request.data)
        self.assertEqual(opener.open.call_args.kwargs, {"timeout": 10})
        self.assertIsInstance(build.call_args.args[0], verifier.NoRedirect)
        tls = build.call_args.args[1]._context
        self.assertTrue(tls.check_hostname)
        self.assertEqual(tls.verify_mode, ssl.CERT_REQUIRED)
        self.assertIsNone(tls.keylog_filename)

    def test_redirect_handler_refuses_redirect_even_to_another_approved_host(self):
        opener = verifier.urllib.request.build_opener(verifier.NoRedirect())
        with patch.object(opener, "open") as follow_redirect:
            for status in (301, 302, 303, 307, 308):
                request = verifier.urllib.request.Request(verifier.CLERK_JWKS,
                                                           headers={"Authorization": "Bearer synthetic"})
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    opener.error("http", request, io.BytesIO(), status, "Redirect",
                                 {"location": verifier.SUPABASE_PROBE})
                caught.exception.close()
            follow_redirect.assert_not_called()

    def test_bounded_or_malformed_jwks_and_network_errors_stay_unverified(self):
        for body in (b"x" * (verifier.MAX_JWKS + 1), b"PRIVATE_RESPONSE_SENTINEL"):
            response = Response(body)
            opener = Mock()
            opener.open.return_value = response
            with patch.object(verifier.urllib.request, "build_opener", return_value=opener):
                self.assertEqual(verifier.read_only_get(verifier.CLERK_JWKS, {}, True), ("UNVERIFIED", None))
            response.read.assert_called_once_with(verifier.MAX_JWKS + 1)
        for error in (TimeoutError("PRIVATE_TIMEOUT"), ssl.SSLError("PRIVATE_TLS")):
            opener = Mock()
            opener.open.side_effect = error
            with patch.object(verifier.urllib.request, "build_opener", return_value=opener):
                self.assertEqual(verifier.read_only_get(verifier.CLERK_JWKS, {}, True), ("UNVERIFIED", None))

    def test_non_tty_never_falls_back_to_environment_or_echoed_input(self):
        with patch.object(verifier.sys, "stdin", io.StringIO("PRIVATE_INPUT")), \
                patch.dict(os.environ, inputs()), patch.object(verifier.getpass, "getpass") as prompt:
            with self.assertRaises(ValueError):
                verifier.read_inputs()
            prompt.assert_not_called()

    def test_getpass_echo_fallback_warning_is_fatal_without_reading(self):
        tty = Mock()
        tty.isatty.return_value = True

        def fallback(*_):
            warnings.warn("PRIVATE_FALLBACK", verifier.getpass.GetPassWarning)
            self.fail("Fallback must stop before reading input")

        with patch.object(verifier.sys, "stdin", tty), patch.object(verifier.sys, "stderr", tty), \
                patch.object(verifier.getpass, "getpass", side_effect=fallback):
            with self.assertRaises(verifier.getpass.GetPassWarning):
                verifier.read_inputs()
            tty.write.assert_not_called()

    def test_input_cancellation_unexpected_errors_and_unknown_args_are_sanitized(self):
        for error in (KeyboardInterrupt(), EOFError("PRIVATE_INPUT"), RuntimeError("PRIVATE_INPUT")):
            code, result, raw = self.render(["--probe"], input_error=error)
            self.assertEqual(code, 1)
            self.assertEqual(result["credential_verification"], "UNVERIFIED")
            self.assertNotIn("PRIVATE_INPUT", raw)
        request = Mock(side_effect=RuntimeError("PRIVATE_REQUEST"))
        code, _, raw = self.render(["--probe"], inputs(), request)
        self.assertEqual(code, 1)
        self.assertNotIn("PRIVATE_REQUEST", raw)
        code, _, raw = self.render(["--secret", "PRIVATE_ARGUMENT"])
        self.assertEqual(code, 1)
        self.assertNotIn("PRIVATE_ARGUMENT", raw)

    def test_actual_terminal_prompts_never_echo_synthetic_credentials(self):
        master, slave = pty.openpty()
        # The child does not inherit this process's mocks; block sockets there too.
        bootstrap = """import runpy, socket, sys
def forbidden(*args, **kwargs):
    sys.stderr.write('TEST_NETWORK_FORBIDDEN\\n')
    raise RuntimeError()
socket.create_connection = forbidden
socket.socket.connect = forbidden
socket.socket.connect_ex = forbidden
sys.argv = [sys.argv[1]]
runpy.run_path(sys.argv[0], run_name='__main__')
"""
        process = subprocess.Popen([sys.executable, "-c", bootstrap, str(SCRIPT)], stdin=slave, stdout=slave, stderr=slave,
                                   start_new_session=True, env={"PYTHONDONTWRITEBYTECODE": "1"})
        os.close(slave)
        transcript = b""
        position = 0
        deadline = time.monotonic() + 10
        try:
            for name, value in inputs().items():
                prompt = f"{name} (hidden): ".encode()
                while prompt not in transcript[position:]:
                    self.assertLess(time.monotonic(), deadline)
                    readable, _, _ = select.select([master], [], [], 0.1)
                    if readable:
                        transcript += os.read(master, 4096)
                position = len(transcript)
                os.write(master, value.encode() + b"\n")
            while time.monotonic() < deadline:
                readable, _, _ = select.select([master], [], [], 0.1)
                if readable:
                    try:
                        chunk = os.read(master, 4096)
                    except OSError:
                        break
                    if not chunk:
                        break
                    transcript += chunk
                elif process.poll() is not None:
                    break
            self.assertEqual(process.wait(timeout=2), 1)
            for value in inputs().values():
                self.assertNotIn(value.encode(), transcript)
            self.assertNotIn(b"TEST_NETWORK_FORBIDDEN", transcript)
            result = json.loads(transcript[transcript.index(b"{"):])
            self.assertEqual(result["clerk_secret_format"], "PASS")
            self.assertEqual(result["credential_verification"], "UNVERIFIED")
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()
            os.close(master)


if __name__ == "__main__":
    unittest.main()
