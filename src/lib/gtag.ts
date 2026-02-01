import { sendGAEvent } from "@next/third-parties/google";

export const trackAmazonClick = (name: string, price: number, category: string) => {
  sendGAEvent({
    event: "amazon_click",
    value: price,
    category: category,
    product_name: name,
  });
};