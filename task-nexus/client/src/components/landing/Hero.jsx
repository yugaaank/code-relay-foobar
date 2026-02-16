import React from "react";
import { Link } from "react-router-dom";
import "./landing.css";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>
          Plan. Track. <span className="text-primary">Succeed.</span>
        </h1>

        <p>
          Task Nexus helps teams organize workspaces, manage projects, and
          execute tasks with precision.
        </p>

        <div className="hero-actions">
          <Link to="/register" className="btn-primary">
            Get Started
          </Link>

          <Link to="/login" className="btn-ghost">
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}
