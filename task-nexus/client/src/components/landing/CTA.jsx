import React from "react";
import { Link } from "react-router-dom";

export default function CTA() {
  return (
    <section className="cta">
      <h2>Start managing your work smarter</h2>
      <Link to="/register" className="btn-primary">
        Create Free Account
      </Link>
    </section>
  );
}
