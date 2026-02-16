import React from "react";
import { LayoutDashboard, FolderKanban, Users } from "lucide-react";

export default function Features() {
  const items = [
    {
      icon: LayoutDashboard,
      title: "Analytics Dashboard",
      desc: "Visualize productivity and task performance.",
    },
    {
      icon: FolderKanban,
      title: "Project Tracking",
      desc: "Organize projects with Kanban workflows.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      desc: "Invite members and work together seamlessly.",
    },
  ];

  return (
    <section className="features">
      <h2>Everything you need to stay productive</h2>

      <div className="feature-grid">
        {items.map((item, i) => (
          <div key={i} className="feature-card glass">
            <item.icon size={28} />
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
