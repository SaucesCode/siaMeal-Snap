import { assertEquals } from "jsr:@std/assert@1";
import { sanitizeItems } from "./items.ts";

Deno.test("keeps well-formed items, rounding numbers and keeping in-range positions", () => {
  assertEquals(
    sanitizeItems([
      { name: "Chicken thigh", amount: "2 pcs", calories: 320.4, protein_g: 30.6, carbs_g: 0, fat_g: 21, x: 0.42, y: 0.38 },
    ]),
    [{ name: "Chicken thigh", amount: "2 pcs", calories: 320, protein_g: 31, carbs_g: 0, fat_g: 21, x: 0.42, y: 0.38 }],
  );
});

Deno.test("drops junk: non-objects, missing names; negative or non-numeric numbers become 0", () => {
  assertEquals(
    sanitizeItems([null, "rice", { name: "  " }, { name: "Rice", calories: -5, protein_g: "lots", carbs_g: 56, fat_g: 1 }]),
    [{ name: "Rice", amount: "", calories: 0, protein_g: 0, carbs_g: 56, fat_g: 1 }],
  );
});

Deno.test("positions are kept only when both are numbers between 0 and 1", () => {
  const [a, b] = sanitizeItems([
    { name: "A", x: 1.4, y: 0.5 },
    { name: "B", x: 0.5 },
  ]);
  assertEquals("x" in a, false);
  assertEquals("y" in b, false);
});

Deno.test("caps the list at 8 items and trims long text", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ name: `Item ${i} ${"x".repeat(60)}`, amount: "a".repeat(40) }));
  const out = sanitizeItems(many);
  assertEquals(out.length, 8);
  assertEquals(out[0].name.length, 40);
  assertEquals(out[0].amount.length, 24);
});

Deno.test("anything that isn't a list gives no items", () => {
  assertEquals(sanitizeItems(undefined), []);
  assertEquals(sanitizeItems({ name: "Rice" }), []);
});
