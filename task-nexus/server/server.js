require("dotenv").config();
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const app = express();
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");

      // In development or if purely local, allow it
      if (process.env.NODE_ENV !== "production" || isLocal) {
        return callback(null, true);
      }

      // Check allowed origins for production
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS Blocked:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123";
// Prisma Client Singleton for Serverless/Hot-Reload
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

const getUserFromAuth = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try {
    const token = authHeader.split(" ")[1];
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
};

app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Avoid long-lived interactive transactions for Data Proxy;
    // perform sequential creates instead.
    const user = await prisma.user.create({
      data: { username, email, password_hash: password },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: `${username} Workspace`,
        description: "Default workspace",
        owner_id: user.id,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
      },
    });

    await prisma.project.create({
      data: {
        name: "My First Project",
        description: "Default project",
        workspace_id: workspace.id,
      },
    });

    const token = jwt.sign({ id: user.id, username, email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username, email } });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Username or email already exists" });
    }
    console.error("Registration failed:", error);
    res.status(500).json({ error: "Registration failed", detail: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "No account found with this email" });
    }

    if (user.password_hash !== password) {
      return res.status(401).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: "Login failed", detail: error.message });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const decoded = getUserFromAuth(req);
  if (!decoded) return res.status(401).json({ error: "No token" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true },
    });
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.get("/api/users/search", async (req, res) => {
  const { email } = req.query;
  if (!email || email.length < 3) return res.json([]);

  if (!getUserFromAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const results = await prisma.user.findMany({
      where: { email: { contains: email } },
      select: { id: true, username: true, email: true },
      take: 10,
    });
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Search failed" });
  }
});

app.get("/api/workspaces", async (req, res) => {
  const decoded = getUserFromAuth(req);
  const userId = decoded?.id || 1;

  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { user_id: userId },
      include: { workspace: true },
      orderBy: { joined_at: "desc" },
    });

    const results = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));

    res.json(results);
  } catch (error) {
    res.status(500).send("Nexus error");
  }
});

app.get("/api/workspaces/:id", async (req, res) => {
  const id = Number(req.params.id);
  const workspace = await prisma.workspace.findUnique({ where: { id } });
  res.json(workspace);
});

app.post("/api/workspaces/:id/invite", async (req, res) => {
  const workspaceId = Number(req.params.id);
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const inviter = getUserFromAuth(req);
  if (!inviter) return res.status(401).json({ error: "Unauthorized" });

  try {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: { workspace_id: workspaceId, user_id: inviter.id },
      },
    });
    if (!membership) return res.status(403).json({ error: "Not a member" });
    if (membership.role !== "owner" && membership.role !== "admin") {
      return res.status(403).json({ error: "No permission to invite" });
    }

    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) return res.status(404).json({ error: "User not found" });

    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: invitedUser.id,
        },
      },
    });
    if (existing) return res.status(400).json({ error: "User already in workspace" });

    await prisma.workspaceMember.create({
      data: { workspace_id: workspaceId, user_id: invitedUser.id, role: "member" },
    });

    res.json({ success: true, message: "User invited successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Invite failed" });
  }
});

app.post("/api/workspaces", async (req, res) => {
  const { name, description } = req.body;
  const decoded = getUserFromAuth(req);
  const userId = decoded?.id || 1;

  try {
    const workspace = await prisma.workspace.create({
      data: { name, description, owner_id: userId },
    });

    await prisma.workspaceMember.create({
      data: { workspace_id: workspace.id, user_id: userId, role: "owner" },
    });

    res.json({ ...workspace, role: "owner" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/workspaces/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.workspace.delete({ where: { id } });
    res.json({ message: "Workspace purged from nexus" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete workspace" });
  }
});

app.get("/api/workspaces/:id/members", async (req, res) => {
  const workspaceId = Number(req.params.id);
  const members = await prisma.workspaceMember.findMany({
    where: { workspace_id: workspaceId },
    include: { user: true },
  });

  res.json(
    members.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      email: m.user.email,
      role: m.role,
    })),
  );
});

app.get("/api/projects/workspace/:workspaceId", async (req, res) => {
  const workspaceId = Number(req.params.workspaceId);
  try {
    const projects = await prisma.project.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: "desc" },
    });

    const projectIds = projects.map((p) => p.id);
    if (projectIds.length === 0) return res.json([]);

    const counts = await prisma.task.groupBy({
      by: ["project_id", "status"],
      where: { project_id: { in: projectIds } },
      _count: { _all: true },
    });

    const countMap = {};
    counts.forEach((c) => {
      const key = `${c.project_id}:${c.status}`;
      countMap[key] = c._count._all;
    });

    const withCounts = projects.map((p) => {
      const taskCount = ["todo", "in_progress", "review", "done"]
        .map((s) => countMap[`${p.id}:${s}`] || 0)
        .reduce((a, b) => a + b, 0);
      const completedCount = countMap[`${p.id}:done`] || 0;
      return { ...p, task_count: taskCount, completed_count: completedCount };
    });

    res.json(withCounts);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
});

app.get("/api/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const project = await prisma.project.findUnique({ where: { id } });
  res.json(project);
});

app.post("/api/projects", async (req, res) => {
  const { name, description, color, workspaceId } = req.body;
  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        color: color || "#3B82F6",
        workspace_id: workspaceId,
      },
    });

    res.json({
      ...project,
      task_count: 0,
      completed_count: 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.project.delete({ where: { id } });
    res.json({ message: "Project purged" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

app.get("/api/tasks", async (req, res) => {
  const { projectId } = req.query;
  try {
    const tasks = await prisma.task.findMany({
      where: projectId ? { project_id: Number(projectId) } : {},
      orderBy: { created_at: "desc" },
      include: { assignee: true },
    });

    res.json(
      tasks.map((t) => ({
        ...t,
        assignee_name: t.assignee ? t.assignee.username : null,
      })),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.post("/api/tasks", async (req, res) => {
  const { title, description, status, priority, due_date, project_id } = req.body;
  const decoded = getUserFromAuth(req);
  const userId = decoded?.id || 1;

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description: description || "",
        status: status || "todo",
        priority: priority || "medium",
        due_date: due_date ? new Date(due_date) : null,
        project_id,
        created_by: userId,
      },
    });

    res.json({
      ...task,
      completed: task.completed,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Nexus error");
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    status,
    priority,
    due_date,
    assignee_id,
    completed,
  } = req.body;

  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (status !== undefined) data.status = status;
  if (priority !== undefined) data.priority = priority;
  if (due_date !== undefined) data.due_date = due_date ? new Date(due_date) : null;
  if (assignee_id !== undefined) data.assignee_id = assignee_id;
  if (completed !== undefined) {
    data.completed = completed;
    if (completed) data.status = "done";
  }

  try {
    await prisma.task.update({
      where: { id: Number(id) },
      data,
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.task.delete({ where: { id } });
    res.json({ message: "Task purged from nexus" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

app.get("/api/analytics/dashboard", async (req, res) => {
  const decoded = getUserFromAuth(req);
  const userId = decoded?.id || 1;

  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { user_id: userId },
      select: { workspace_id: true },
    });
    const wsIds = memberships.map((m) => m.workspace_id);
    if (wsIds.length === 0) {
      return res.json({
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        totalProjects: 0,
        totalWorkspaces: 0,
        recentActivity: [],
        tasksByStatus: [],
        tasksByPriority: [],
      });
    }

    const taskWhere = { project: { workspace_id: { in: wsIds } } };

    const [totalTasks, completedTasks, inProgressTasks, overdueTasks, totalProjects, byStatus, byPriority] =
      await Promise.all([
        prisma.task.count({ where: taskWhere }),
        prisma.task.count({ where: { ...taskWhere, status: "done" } }),
        prisma.task.count({ where: { ...taskWhere, status: "in_progress" } }),
        prisma.task.count({
          where: { ...taskWhere, due_date: { lt: new Date() }, status: { not: "done" } },
        }),
        prisma.project.count({ where: { workspace_id: { in: wsIds } } }),
        prisma.task.groupBy({
          by: ["status"],
          _count: { _all: true },
          where: taskWhere,
        }),
        prisma.task.groupBy({
          by: ["priority"],
          _count: { _all: true },
          where: taskWhere,
        }),
      ]);

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalProjects,
      totalWorkspaces: wsIds.length,
      recentActivity: [],
      tasksByStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      tasksByPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count._all })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Analytics failed" });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Nexus stability layer active on port ${PORT} with Prisma.`);
  });
}

module.exports = app;
