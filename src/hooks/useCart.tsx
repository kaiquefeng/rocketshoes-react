import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const existedProduct = cart.find((item) => item.id === productId);
      const stockData = await api.get<Stock>(`/stock/${productId}`);

      const stock = stockData.data;

      if (existedProduct) {
        if (existedProduct.amount >= stock.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        const newProductCart = cart.map((product) =>
          product.id === productId
            ? {
                ...product,
                amount: product.amount + 1,
              }
            : product
        );

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newProductCart));
        setCart(newProductCart);
      } else {
        const newProductData = await api.get(`/products/${productId}`);

        if (newProductData.data) {
          const newProduct = {
            ...newProductData.data,
            amount: 1,
          };

          const newProductCart = [...cart, newProduct];

          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newProductCart));
          setCart(newProductCart);
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some((product) => product.id === productId);

      if (!productExists) {
        throw new Error();
      }

      const newProductCart = cart.filter((product) => product.id !== productId);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newProductCart));
      setCart(newProductCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockData = await api.get<Stock>(`/stock/${productId}`);
      const stock = stockData.data;

      if (amount <= 0) {
        return;
      }

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      const updatedProduct = cart.map((product) =>
        product.id === productId
          ? {
              ...product,
              amount,
            }
          : product
      );

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedProduct));
      setCart(updatedProduct);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
