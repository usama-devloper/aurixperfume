
import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { CartItem, Product } from '../types';
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export interface CartState {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  lastRemovedItem?: CartItem | null;
}

export type CartAction = 
  | { type: 'ADD_ITEM', payload: { product: Product, quantity: number } }
  | { type: 'REMOVE_ITEM', payload: { id: number } }
  | { type: 'RESTORE_ITEM', payload: { item: CartItem } }
  | { type: 'UPDATE_QUANTITY', payload: { id: number, quantity: number } }
  | { type: 'CLEAR_CART' };

export interface CartContextType extends CartState {
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  restoreItem: (item: CartItem) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const calculateTotals = (items: CartItem[]): { totalItems: number, totalAmount: number } => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  return { totalItems, totalAmount };
};

export const cartReducer = (state: CartState, action: CartAction): CartState => {
  console.log('Cart reducer action:', action.type, 'payload' in action ? action.payload : 'no payload');
  
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity = 1 } = action.payload;
      const existingItemIndex = state.items.findIndex(item => item.product.id === product.id);
      
      if (existingItemIndex > -1) {
        // Item exists, add to existing quantity up to store max of 10
        const updatedItems = [...state.items];
        const newQuantity = Math.min(10, updatedItems[existingItemIndex].quantity + quantity);
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: newQuantity
        };
        const { totalItems, totalAmount } = calculateTotals(updatedItems);
        console.log('Updated existing item, new totals:', { totalItems, totalAmount });
        return { ...state, items: updatedItems, totalItems, totalAmount };
      } else {
        // New item, add to cart with requested quantity
        const updatedItems = [...state.items, { product, quantity: Math.min(10, Math.max(1, quantity)) }];
        const { totalItems, totalAmount } = calculateTotals(updatedItems);
        console.log('Added new item, new totals:', { totalItems, totalAmount });
        return { ...state, items: updatedItems, totalItems, totalAmount };
      }
    }
    
    case 'REMOVE_ITEM': {
      const itemToRemove = state.items.find(item => item.product.id === action.payload.id);
      const updatedItems = state.items.filter(item => item.product.id !== action.payload.id);
      const { totalItems, totalAmount } = calculateTotals(updatedItems);
      console.log('Removed item, new totals:', { totalItems, totalAmount });
      return { 
        ...state, 
        items: updatedItems, 
        totalItems, 
        totalAmount, 
        lastRemovedItem: itemToRemove || null 
      };
    }

    case 'RESTORE_ITEM': {
      const { item } = action.payload;
      const existingIndex = state.items.findIndex(i => i.product.id === item.product.id);
      let updatedItems: CartItem[];
      if (existingIndex > -1) {
        // Already in cart - update to restored quantity without duplicating
        updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: item.quantity
        };
      } else {
        updatedItems = [...state.items, item];
      }
      const { totalItems, totalAmount } = calculateTotals(updatedItems);
      console.log('Restored item, new totals:', { totalItems, totalAmount });
      return { ...state, items: updatedItems, totalItems, totalAmount, lastRemovedItem: null };
    }
    
    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      if (quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: { id } });
      }
      
      const updatedItems = state.items.map(item => 
        item.product.id === id ? { ...item, quantity: Math.min(10, Math.max(1, quantity)) } : item
      );
      const { totalItems, totalAmount } = calculateTotals(updatedItems);
      console.log('Updated quantity, new totals:', { totalItems, totalAmount });
      return { ...state, items: updatedItems, totalItems, totalAmount };
    }
    
    case 'CLEAR_CART':
      console.log('Cleared cart');
      return { items: [], totalItems: 0, totalAmount: 0, lastRemovedItem: null };
    
    default:
      return state;
  }
};

// Try to load cart from localStorage
const loadCartFromStorage = (): CartState => {
  try {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      const recalculatedTotals = calculateTotals(parsedCart.items || []);
      console.log('Loaded cart from storage:', { ...parsedCart, ...recalculatedTotals });
      return {
        ...parsedCart,
        ...recalculatedTotals,
        lastRemovedItem: null
      };
    }
  } catch (error) {
    console.error("Failed to load cart from localStorage:", error);
  }
  
  return { items: [], totalItems: 0, totalAmount: 0, lastRemovedItem: null };
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, loadCartFromStorage());
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    console.log('Saving cart to localStorage:', state);
    const { lastRemovedItem, ...persistState } = state;
    localStorage.setItem('cart', JSON.stringify(persistState));
  }, [state]);
  
  const addItem = (product: Product, quantity = 1) => {
    console.log('Adding item to cart:', { product: product.name, quantity });
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
    toast({
      title: "Added to Bag",
      description: `${quantity} ${quantity > 1 ? 'flacons' : 'flacon'} of ${product.name} added to your bag.`,
      duration: 3000,
    });
  };
  
  const removeItem = (id: number) => {
    console.log('Removing item from cart:', id);
    const itemToRemove = state.items.find(item => item.product.id === id);
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
    
    if (itemToRemove) {
      toast({
        title: "Item removed",
        description: `${itemToRemove.product.name} removed from your bag.`,
        duration: 5000,
        action: (
          <ToastAction
            altText={`Restore ${itemToRemove.product.name} to cart`}
            onClick={() => {
              dispatch({ type: 'RESTORE_ITEM', payload: { item: itemToRemove } });
              toast({
                title: "Item restored",
                description: `${itemToRemove.product.name} (${itemToRemove.quantity}) has been restored to your bag.`,
                duration: 2500,
              });
            }}
            className="border-[#C5A880]/60 text-foreground hover:bg-[#C5A880]/15 hover:text-[#C5A880]"
          >
            Undo
          </ToastAction>
        ),
      });
    }
  };
  
  const updateQuantity = (id: number, quantity: number) => {
    console.log('Updating quantity:', { id, quantity });
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const setQuantity = (id: number, quantity: number) => {
    updateQuantity(id, quantity);
  };

  const restoreItem = (item: CartItem) => {
    dispatch({ type: 'RESTORE_ITEM', payload: { item } });
  };
  
  const clearCart = () => {
    console.log('Clearing cart');
    dispatch({ type: 'CLEAR_CART' });
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
      duration: 3000,
    });
  };
  
  const value = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    setQuantity,
    restoreItem,
    clearCart
  };
  
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
