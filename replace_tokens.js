const fs = require("fs");
const path = require("path");

const filesToUpdatePremium = [
  "src/screens/Account/ChangePassword.js",
  "src/screens/Account/ChangePin.js",
  "src/screens/Account/ForgotPassword.js",
  "src/screens/Account/ForgotPin.js",
  "src/screens/Profile/ProfileScreen.js",
];

const fileActivate = "src/screens/AccountActivate/ActivateAccountScreen.js";
const fileKyc = "src/screens/kyc/Offlinekyc.js";

// Remove the const T = {...} and const C = {...} definitions from the files
const removeRegexPremium = /\/\* ─────────────────────────────────────────────\r?\n\s+(DESIGN TOKENS|DESIGN TOKENS  \(Camlenio premium palette\)|DESIGN TOKENS  \(mirrors Camlenio HTML tokens\)|DESIGN TOKENS  \(mirrors ChangePasswordScreen\))\r?\n───────────────────────────────────────────── \*\/\r?\nconst T = \{[\s\S]*?\};\r?\n/g;

const removeRegexActivate = /\/\/ ─── Colours ────────────────────────────────────────────────────\r?\nconst C = \{[\s\S]*?\};\r?\n/g;

const removeRegexKyc = /\/\/ ─── Design tokens ────────────────────────────────────────────────────────\r?\nconst T = \{[\s\S]*?\};\r?\n/g;


function processFile(filePath, regexToRemove, tokenPrefix, objectVar) {
  const absolutePath = path.join(__dirname, filePath);
  if (!fs.existsSync(absolutePath)) {
    console.log("Not found:", absolutePath);
    return;
  }
  let content = fs.readFileSync(absolutePath, "utf-8");
  
  // Remove object definition
  content = content.replace(regexToRemove, "");

  // Replace usages with `Colors.prefix_`
  // Regex looks for `T.ink` or `C.green` etc.
  const usageRegex = new RegExp(`\\b${objectVar}\\.([a-zA-Z0-9_]+)`, 'g');
  
  content = content.replace(usageRegex, (match, prop) => {
    // If it's the Premium ones (T.), we just use `Colors.prop`
    if (tokenPrefix === "") {
        return `Colors.${prop}`;
    }
    return `Colors.${tokenPrefix}${prop}`;
  });

  fs.writeFileSync(absolutePath, content, "utf-8");
  console.log("Updated:", absolutePath);
}

// 1. Premium files (T -> Colors.)
for (const file of filesToUpdatePremium) {
  processFile(file, removeRegexPremium, "", "T");
}

// 2. Activate Account (C -> Colors.hub_)
processFile(fileActivate, removeRegexActivate, "hub_", "C");

// 3. Offline KYC (T -> Colors.kyc_)
processFile(fileKyc, removeRegexKyc, "kyc_", "T");
