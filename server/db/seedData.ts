import type { InferInsertModel } from "drizzle-orm";
import type { products } from "./schema";

type InsertProduct = InferInsertModel<typeof products>;

export const productsSeedData: Omit<InsertProduct, "id">[] = [
  {
    name: "Lavirant",
    description:
      "Pełna edycja z aplikacją mobilną. Intensywna gra towarzyska łącząca logiczne myślenie, umiejętność czytania ludzi i perfekcyjne kłamstwo. Idealna na imprezy i wieczory ze znajomymi.",
    price: 29900,
    image: "/image.png",
    category: "Gry planszowe",
    availableQuantity: 100,
  },
];
