import content from "@/lib/content.json";
import { FooterBackground } from "./footer/FooterBackground";
import { FooterBrand } from "./footer/FooterBrand";
import { FooterSocial } from "./footer/FooterSocial";
import { FooterQuickLinks } from "./footer/FooterQuickLinks";
import { FooterContact } from "./footer/FooterContact";
import { FooterLegal } from "./footer/FooterLegal";

const { footer } = content;

function Footer() {
  return (
    <footer className="bg-[#0f2433] text-white pt-24 pb-10 relative" role="contentinfo">
      <FooterBackground />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 mb-20">
          <div>
            <FooterBrand
              logoUrl={footer.logoUrl}
              logoAlt={footer.logoAlt}
              brandName={footer.brandName}
              description={footer.description}
            />
            <FooterSocial platforms={footer.social.platforms} />
          </div>

          <FooterQuickLinks title={footer.quickLinks.title} links={footer.quickLinks.links} />
          <FooterContact contact={footer.contact} />
        </div>

        <FooterLegal copyright={footer.legal.copyright} links={footer.legal.links} />
      </div>
    </footer>
  );
}

export default Footer;
