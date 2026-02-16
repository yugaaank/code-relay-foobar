import React from "react";
import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";

export default function Landing() {
  return (
    <div className="landing-page">
      <Hero />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}
