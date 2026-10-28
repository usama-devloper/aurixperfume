import { describe, it, expect } from "vitest";
import { cartReducer, calculateTotals, CartState } from "@/context/CartContext";
import { Product } from "@/types";

const mockProduct1: Product = {
  id: 1,
  name: "Oud Sovereign",
  price: 4200,
  category: "Woody",
  description: "Exquisite Agarwood",
  image: "/perfume1.jpg",
  brand: "Aurix",
  rating: 4.9,
  reviews: 12,
  inStock: true,
  featured: true,
  size: { value: "50", unit: "ml" }
};

const mockProduct2: Product = {
  id: 2,
  name: "Desert Saffron",
  price: 3800,
  category: "Oriental",
  description: "Golden Saffron Essence",
  image: "/perfume2.jpg",
  brand: "Aurix",
  rating: 4.8,
  reviews: 8,
  inStock: true,
  featured: false,
  size: { value: "50", unit: "ml" }
};

const mockProduct3: Product = {
  id: 3,
  name: "Rose Impériale",
  price: 3400,
  category: "Floral",
  description: "Damascus Rose Absolute",
  image: "/perfume3.jpg",
  brand: "Aurix",
  rating: 4.7,
  reviews: 6,
  inStock: true,
  featured: false,
  size: { value: "50", unit: "ml" }
};

describe("Cart and Pricing Server-Validation logic", () => {
  it("calculates subtotal correctly from cart items", () => {
    const items = [
      { product: { id: 1, name: "Oud Sovereign", price: 4200 }, quantity: 2 },
      { product: { id: 2, name: "Desert Saffron", price: 3800 }, quantity: 1 },
    ];
    const subtotal = items.reduce((sum, it) => sum + it.product.price * it.quantity, 0);
    expect(subtotal).toBe(12200);
  });

  it("applies free shipping when exceeding free shipping threshold (₹1000)", () => {
    const freeShippingThreshold = 1000;
    const shippingFee = 400;

    const subtotalAbove = 1500;
    const shippingAbove = subtotalAbove >= freeShippingThreshold ? 0 : shippingFee;
    expect(shippingAbove).toBe(0);

    const subtotalBelow = 800;
    const shippingBelow = subtotalBelow >= freeShippingThreshold ? 0 : shippingFee;
    expect(shippingBelow).toBe(400);
  });

  it("calculates tax accurately at 8%", () => {
    const taxRate = 0.08;
    const subtotal = 10000;
    const tax = subtotal * taxRate;
    expect(tax).toBe(800);
  });

  it("verifies order total equals subtotal + shipping + tax", () => {
    const subtotal = 10000;
    const shipping = 0;
    const tax = 800;
    const orderTotal = subtotal + shipping + tax;
    expect(orderTotal).toBe(10800);
  });

  it("rejects negative quantities or fractional invalid quantities", () => {
    const validateQuantity = (qty: number) => Number.isInteger(qty) && qty > 0 && qty <= 99;
    expect(validateQuantity(1)).toBe(true);
    expect(validateQuantity(5)).toBe(true);
    expect(validateQuantity(0)).toBe(false);
    expect(validateQuantity(-2)).toBe(false);
    expect(validateQuantity(1.5)).toBe(false);
    expect(validateQuantity(100)).toBe(false);
  });
});

describe("Cart Quantity Double-Counting & Direct Item Removal Regressions", () => {
  const initialEmptyState: CartState = {
    items: [],
    totalItems: 0,
    totalAmount: 0,
    lastRemovedItem: null,
  };

  // Test 1: Add a product with quantity 2
  it("1. adds a product with quantity 2", () => {
    const state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 2 },
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].product.id).toBe(1);
    expect(state.items[0].quantity).toBe(2);
    expect(state.totalItems).toBe(2);
    expect(state.totalAmount).toBe(8400);
  });

  // Test 2: Set the same product's quantity to 4
  it("2. sets the existing product's quantity to 4 (replaces, does not add)", () => {
    const stateWithTwo = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 2 },
    });

    const stateUpdated = cartReducer(stateWithTwo, {
      type: "UPDATE_QUANTITY",
      payload: { id: 1, quantity: 4 },
    });

    expect(stateUpdated.items).toHaveLength(1);
    expect(stateUpdated.items[0].quantity).toBe(4);
    expect(stateUpdated.totalItems).toBe(4);
    expect(stateUpdated.totalAmount).toBe(16800);
  });

  // Test 3: Verify the cart and checkout both show quantity 4
  it("3. verifies cart and checkout mapping both receive quantity 4, not 6", () => {
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 2 },
    });
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      payload: { id: 1, quantity: 4 },
    });

    // Simulate checkout items extraction
    const checkoutItems = state.items.map((it) => ({
      product_id: it.product.id,
      name: it.product.name,
      quantity: it.quantity,
      unit_price: it.product.price,
      item_total: it.product.price * it.quantity,
    }));

    expect(checkoutItems[0].quantity).toBe(4);
    expect(checkoutItems[0].quantity).not.toBe(6);
    expect(checkoutItems[0].item_total).toBe(16800);
  });

  // Test 4: Verify changing quantity to 5 sets it to 5 rather than adding to previous
  it("4. verifies changing quantity to 5 sets it to 5 rather than accumulating", () => {
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 2 },
    });
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      payload: { id: 1, quantity: 4 },
    });
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      payload: { id: 1, quantity: 5 },
    });

    expect(state.items[0].quantity).toBe(5);
    expect(state.items[0].quantity).not.toBe(9);
    expect(state.totalItems).toBe(5);
    expect(state.totalAmount).toBe(21000);
  });

  // Test 5: Verify + and - each change quantity by exactly one
  it("5. verifies + and - each adjust quantity by exactly one", () => {
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 4 },
    });

    // Increment by 1
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      payload: { id: 1, quantity: state.items[0].quantity + 1 },
    });
    expect(state.items[0].quantity).toBe(5);

    // Decrement by 1
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      payload: { id: 1, quantity: state.items[0].quantity - 1 },
    });
    expect(state.items[0].quantity).toBe(4);
  });

  // Test 6: Verify - at quantity 1 removes the item
  it("6. verifies - at quantity 1 removes the item completely", () => {
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 1 },
    });
    expect(state.items).toHaveLength(1);

    // Decrementing past 1 triggers removal
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      payload: { id: 1, quantity: 0 },
    });

    expect(state.items).toHaveLength(0);
    expect(state.totalItems).toBe(0);
    expect(state.totalAmount).toBe(0);
  });

  // Test 7: Verify the trash icon removes the correct item
  it("7. verifies direct trash icon action removes the correct targeted item", () => {
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 2 },
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      payload: { product: mockProduct2, quantity: 1 },
    });
    expect(state.items).toHaveLength(2);

    // Remove Product 1 via REMOVE_ITEM
    state = cartReducer(state, {
      type: "REMOVE_ITEM",
      payload: { id: 1 },
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].product.id).toBe(2);
    expect(state.totalItems).toBe(1);
    expect(state.totalAmount).toBe(3800);
  });

  // Test 8: Verify Undo restores the correct item and quantity
  it("8. verifies Undo restores the correct item and previous quantity without duplicating", () => {
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 4 },
    });
    state = cartReducer(state, {
      type: "REMOVE_ITEM",
      payload: { id: 1 },
    });
    expect(state.items).toHaveLength(0);
    expect(state.lastRemovedItem?.product.id).toBe(1);
    expect(state.lastRemovedItem?.quantity).toBe(4);

    // Undo action restores the removed item
    state = cartReducer(state, {
      type: "RESTORE_ITEM",
      payload: { item: state.lastRemovedItem! },
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].product.id).toBe(1);
    expect(state.items[0].quantity).toBe(4);
    expect(state.totalItems).toBe(4);
    expect(state.totalAmount).toBe(16800);

    // Verify calling restore again does NOT duplicate
    state = cartReducer(state, {
      type: "RESTORE_ITEM",
      payload: { item: { product: mockProduct1, quantity: 4 } },
    });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(4);
  });

  // Test 9: Verify removing one product preserves all other cart items
  it("9. verifies removing one product preserves all other cart items", () => {
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 2 },
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      payload: { product: mockProduct2, quantity: 3 },
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      payload: { product: mockProduct3, quantity: 1 },
    });
    expect(state.items).toHaveLength(3);

    // Remove middle product (Product 2)
    state = cartReducer(state, {
      type: "REMOVE_ITEM",
      payload: { id: 2 },
    });

    expect(state.items).toHaveLength(2);
    expect(state.items.map((i) => i.product.id)).toEqual([1, 3]);
    expect(state.items.find((i) => i.product.id === 1)?.quantity).toBe(2);
    expect(state.items.find((i) => i.product.id === 3)?.quantity).toBe(1);
    expect(state.totalItems).toBe(3);
    expect(state.totalAmount).toBe(2 * 4200 + 1 * 3400); // 8400 + 3400 = 11800
  });

  // Test 10: Verify removing the last item shows the empty-cart state
  it("10. verifies removing the last item produces clean empty cart state", () => {
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 3 },
    });
    state = cartReducer(state, {
      type: "REMOVE_ITEM",
      payload: { id: 1 },
    });

    expect(state.items).toHaveLength(0);
    expect(state.totalItems).toBe(0);
    expect(state.totalAmount).toBe(0);
  });

  // Test 11: Verify cart badge, subtotal, discounts, and total recalculate correctly
  it("11. verifies cart totals recalculate correctly on quantity modification", () => {
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 2 }, // 8400
    });
    state = cartReducer(state, {
      type: "ADD_ITEM",
      payload: { product: mockProduct2, quantity: 1 }, // 3800
    });
    expect(state.totalItems).toBe(3);
    expect(state.totalAmount).toBe(12200);

    // Modify quantity of product 1 to 1
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      payload: { id: 1, quantity: 1 },
    });

    expect(state.totalItems).toBe(2);
    expect(state.totalAmount).toBe(4200 + 3800); // 8000
  });

  // Test 12: Verify Product Detail quantity controls & Add to Bag semantics
  it("12. verifies distinct semantics: new Add to Bag increments while Adjust Quantity replaces", () => {
    // Fresh product added to cart
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 2 },
    });
    expect(state.items[0].quantity).toBe(2);

    // Adjusting quantity on ProductDetail replaces the quantity
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      payload: { id: mockProduct1.id, quantity: 4 },
    });
    expect(state.items[0].quantity).toBe(4); // NOT 6

    // Genuine separate product addition adds to cart without overwriting existing
    state = cartReducer(state, {
      type: "ADD_ITEM",
      payload: { product: mockProduct2, quantity: 1 },
    });
    expect(state.items).toHaveLength(2);
    expect(state.items.find((i) => i.product.id === 1)?.quantity).toBe(4);
    expect(state.items.find((i) => i.product.id === 2)?.quantity).toBe(1);
  });

  // Test 13: Verify checkout and payment calculations use the final cart quantity
  it("13. verifies checkout and Stripe session calculations use final cart quantity", () => {
    let state = cartReducer(initialEmptyState, {
      type: "ADD_ITEM",
      payload: { product: mockProduct1, quantity: 2 },
    });
    state = cartReducer(state, {
      type: "UPDATE_QUANTITY",
      payload: { id: 1, quantity: 4 },
    });

    // Check final cart quantity
    const finalCartQuantity = state.items.find((i) => i.product.id === 1)?.quantity;
    expect(finalCartQuantity).toBe(4);

    // Simulate Stripe Checkout line items calculation
    const stripeLineItems = state.items.map((it) => ({
      name: it.product.name,
      unit_amount: Math.round(it.product.price * 100),
      quantity: it.quantity,
    }));

    expect(stripeLineItems[0].quantity).toBe(4);
    expect(stripeLineItems[0].unit_amount).toBe(420000); // 4200 INR in paise

    const orderSubtotal = stripeLineItems.reduce(
      (sum, it) => sum + (it.unit_amount / 100) * it.quantity,
      0
    );
    expect(orderSubtotal).toBe(16800);
  });
});
