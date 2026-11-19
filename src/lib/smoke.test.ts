import { cn } from "@/lib/utils";

test("cn combina clases y descarta valores falsos", () => {
  expect(cn("a", false && "b", "c")).toBe("a c");
});
