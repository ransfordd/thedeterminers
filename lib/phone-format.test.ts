import assert from "node:assert/strict";
import {
  isPhoneLikeIdentifier,
  normalizePhone,
  phoneMatchVariants,
  storagePhone,
  userMatchesIdentifier,
} from "./phone-format";

assert.equal(normalizePhone("0244123456"), "233244123456");
assert.equal(storagePhone("0244123456"), "233244123456");

const variants = phoneMatchVariants("0244123456");
assert.ok(variants.includes("0244123456"));
assert.ok(variants.includes("233244123456"));

assert.equal(isPhoneLikeIdentifier("0244123456"), true);
assert.equal(isPhoneLikeIdentifier("user@example.com"), false);
assert.equal(isPhoneLikeIdentifier("myusername"), false);

assert.equal(
  userMatchesIdentifier(
    { phone: "233244123456", email: "a@b.com", username: "alice" },
    "0244123456",
  ),
  true,
);

console.log("phone-format tests passed");
