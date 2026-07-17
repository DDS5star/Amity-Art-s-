import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Logo } from "@/components/site/Logo";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { CartDrawer } from "@/components/cart/CartDrawer";

/** Storefront chrome — the admin area under /admin has its own shell. */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <Navbar logo={<Logo />} />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
    </>
  );
}
