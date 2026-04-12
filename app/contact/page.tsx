import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — Peregrio",
  description: "Get in touch with the Peregrio team.",
};

export default function ContactPage() {
  return <ContactForm />;
}
