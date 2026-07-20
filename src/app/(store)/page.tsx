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
import { JsonLd, organizationLd, webSiteLd } from "@/components/seo/JsonLd";

export const revalidate = 300; // homepage content refreshes every 5 minutes

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationLd()} />
      <JsonLd data={webSiteLd()} />
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
