import { Hero } from "@/components/home/Hero";
import {
  TrustStrip,
  CategoryRail,
  BestSellers,
  BrandStory,
  NewArrivals,
  Testimonials,
  Newsletter,
} from "@/components/home/sections";

export const revalidate = 300; // homepage content refreshes every 5 minutes

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <CategoryRail />
      <BestSellers />
      <BrandStory />
      <NewArrivals />
      <Testimonials />
      <Newsletter />
    </>
  );
}
