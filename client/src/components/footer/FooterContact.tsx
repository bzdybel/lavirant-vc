import { motion } from "framer-motion";
import { Mail, MapPin, Phone } from "lucide-react";

interface ContactInfo {
  title: string;
  address: {
    street: string;
    postal: string;
    country: string;
  };
  phone: string;
  email: string;
}

interface FooterContactProps {
  contact: ContactInfo;
}

const SECTION_TITLE_STYLE = {
  background: "linear-gradient(to right, #c9a24d, #a67c4a)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent"
};

const iconWrapperClassName =
  "p-2 bg-[#0f2433] rounded-full mr-4 border border-[#c9a24d]/30 group-hover:border-[#c9a24d] transition-all duration-300";

export const FooterContact = ({ contact }: FooterContactProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.2 }}
    viewport={{ once: true }}
    className="flex flex-col items-center text-center"
  >
    <h3 className="font-playfair text-xl font-bold mb-8 inline-block" style={SECTION_TITLE_STYLE}>
      {contact.title}
    </h3>
    <ul className="space-y-6">
      <li className="flex items-center group">
        <div className={iconWrapperClassName}>
          <Phone className="h-5 w-5 text-[#c9a24d]" />
        </div>
        <span className="text-white/70 group-hover:text-white/90 transition-colors">
          {contact.phone}
        </span>
      </li>
      <li className="flex items-center group">
        <div className={iconWrapperClassName}>
          <Mail className="h-5 w-5 text-[#c9a24d]" />
        </div>
        <span className="text-white/70 group-hover:text-white/90 transition-colors">
          {contact.email}
        </span>
      </li>
    </ul>
  </motion.div>
);
