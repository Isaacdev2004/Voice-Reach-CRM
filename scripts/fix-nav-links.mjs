import fs from "fs";
import path from "path";

const stitchDir = path.resolve("components/pages/stitch");

function patch(file, replacements) {
  const p = path.join(stitchDir, file);
  let c = fs.readFileSync(p, "utf8");
  for (const [from, to] of replacements) {
    c = c.replaceAll(from, to);
  }
  if (!c.includes('from "next/link"') && c.includes("<Link")) {
    c = c.replace(
      '"use client";\n\nimport Image',
      '"use client";\n\nimport Link from "next/link";\nimport Image',
    );
  }
  if (c.includes('href="/sign-in"') || c.includes('href="/sign-up"') || c.includes('href="/dashboard"')) {
    if (!c.includes('import Link from "next/link"')) {
      c = c.replace(
        '"use client";\n\n',
        '"use client";\n\nimport Link from "next/link";\n\n',
      );
    }
    c = c.replace(/<a href="(\/[^"]+)"/g, '<Link href="$1"');
    c = c.replace(/<\/a>/g, "</Link>");
  }
  fs.writeFileSync(p, c);
}

patch("LandingPage.tsx", [
  ['<button className="hidden sm:block', '<Link href="/sign-in" className="hidden sm:block'],
  ['</button>\n                <button className="bg-primary text-on-primary', '</Link>\n                <Link href="/sign-up" className="bg-primary text-on-primary'],
  ['Start Free Trial\n                    </button>', 'Start Free Trial\n                    </Link>'],
  ['<button className="w-full sm:w-auto bg-primary', '<Link href="/sign-up" className="w-full sm:w-auto bg-primary'],
  ['Book Demo\n                    </button>', 'Book Demo\n                    </Link>'],
  ['Claim Your Free Trial\n                    </button>', 'Claim Your Free Trial\n                    </Link>'],
]);

patch("AuthSignInPage.tsx", [
  ['<a class="text-secondary', '<Link href="/sign-up" className="text-secondary'],
  ['Sign Up</a>', 'Sign Up</Link>'],
  ['<a class="font-label-md text-label-md text-secondary hover:underline transition-all" href="#">Forgot?</a>',
   '<Link className="font-label-md text-label-md text-secondary hover:underline transition-all" href="/sign-in">Forgot?</Link>'],
]);

patch("AuthSignUpPage.tsx", [
  ['Sign In</a>', 'Sign In</Link>'],
  ['href="/sign-in">Sign In', 'href="/sign-in">Sign In'],
]);

console.log("Navigation links patched");
