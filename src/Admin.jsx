import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

const ADMIN_EMAIL = "spreedow@gmail.com";
const BUCKET = "portfolio-previews";

const CATEGORIES = [
  "Graphic Design",
  "Excel & Data",
  "Tally & Accounts",
  "Word Documents",
];

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
];

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f7f2",
    color: "#24372b",
    padding: "32px 20px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1050px",
    margin: "0 auto",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8df",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 5px 20px rgba(35, 55, 40, 0.04)",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #d7dfd4",
    borderRadius: "8px",
    marginBottom: "18px",
    fontSize: "15px",
    background: "#fff",
    color: "#24372b",
  },
  button: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    background: "#315c42",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d7dfd4",
    borderRadius: "8px",
    padding: "10px 14px",
    background: "#fff",
    color: "#315c42",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid #f0caca",
    borderRadius: "8px",
    padding: "10px 14px",
    background: "#fff7f7",
    color: "#a42c2c",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  muted: {
    color: "#6c796d",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  message: {
    padding: "12px 14px",
    borderRadius: "8px",
    background: "#edf5ec",
    color: "#285c35",
    marginBottom: "18px",
    overflowWrap: "anywhere",
  },
  error: {
    padding: "12px 14px",
    borderRadius: "8px",
    background: "#fff0f0",
    color: "#a42c2c",
    marginBottom: "18px",
    overflowWrap: "anywhere",
  },
};

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".m4v"];

function isVideoUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  const cleanUrl = url.trim().split("#")[0].split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => cleanUrl.endsWith(ext));
}

function getVideoMimeType(url) {
  const cleanUrl = typeof url === "string" ? url.trim().split("#")[0].split("?")[0].toLowerCase() : "";

  if (cleanUrl.endsWith(".webm")) return "video/webm";
  if (cleanUrl.endsWith(".ogg") || cleanUrl.endsWith(".ogv")) return "video/ogg";
  if (cleanUrl.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

function getStoragePathFromUrl(url) {
  try {
    const parsed = new URL(url);
    const marker = `/object/public/${BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function createExistingImageItems(urls) {
  return (urls ?? []).map((url) => ({
    id: `existing-${url}`,
    type: "existing",
    url,
    mediaType: isVideoUrl(url) ? "video" : "image",
  }));
}

function isVideoItem(item) {
  if (!item) return false;
  if (item.mediaType) return item.mediaType === "video";
  if (item.type === "new") return item.file?.type?.startsWith("video/");
  const url = item.type === "existing" ? item.url : item.previewUrl;
  return isVideoUrl(url);
}

function MediaPreview({ url, title, index, isVideo }) {
  const baseStyle = {
    width: "100%",
    height: "130px",
    objectFit: "cover",
    display: "block",
    background: "#000",
  };

  if (isVideo) {
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        draggable={false}
        aria-label={`${title} video ${index + 1}`}
        style={baseStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <source src={url} type={getVideoMimeType(url)} />
      </video>
    );
  }

  return (
    <img
      src={url}
      alt={`${title} preview ${index + 1}`}
      loading="lazy"
      draggable={false}
      style={baseStyle}
    />
  );
}

export default function Admin() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [projects, setProjects] = useState([]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Graphic Design");
  const [description, setDescription] = useState("");

  const [imageItems, setImageItems] = useState([]);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [originalImageUrls, setOriginalImageUrls] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const fileInputRef = useRef(null);
  const imageItemsRef = useRef([]);

  useEffect(() => {
    imageItemsRef.current = imageItems;
  }, [imageItems]);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!active) return;

      if (sessionError) {
        setError(sessionError.message);
      }

      const currentUser = data.session?.user ?? null;

      if (currentUser?.email?.toLowerCase() === ADMIN_EMAIL) {
        setUser(currentUser);
      } else {
        setUser(null);
      }

      setCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      const currentUser = session?.user ?? null;

      if (currentUser?.email?.toLowerCase() === ADMIN_EMAIL) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      imageItemsRef.current.forEach((item) => {
        if (item?.type === "new" && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (user?.email?.toLowerCase() === ADMIN_EMAIL) {
      loadProjects();
    }
  }, [user]);

  async function loadProjects() {
    setError("");

    const { data, error: fetchError } = await supabase
      .from("portfolio_projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(`Could not load projects: ${fetchError.message}`);
      return;
    }

    setProjects(data ?? []);
  }

  function resetForm() {
    setTitle("");
    setCategory("Graphic Design");
    setDescription("");
    setEditingProjectId(null);
    setOriginalImageUrls([]);
    setDraggedIndex(null);

    setImageItems((current) => {
      current.forEach((item) => {
        if (item?.type === "new" && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

      return [];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function startEditing(project) {
    setError("");
    setMessage("");

    setEditingProjectId(project.id);
    setTitle(project.title || "");
    setCategory(project.category || "Graphic Design");
    setDescription(project.description || "");
    setOriginalImageUrls(project.image_urls ?? []);
    setImageItems(createExistingImageItems(project.image_urls ?? []));
    setDraggedIndex(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    resetForm();
    setMessage("Edit cancelled.");
  }

  function handleImageUpload(event) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const nextItems = files.map((file) => ({
      id: crypto.randomUUID(),
      type: "new",
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType: file.type.startsWith("video/") ? "video" : "image",
    }));

    setImageItems((current) => [...current, ...nextItems]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDragStart(index, event) {
    const item = imageItemsRef.current[index];
    if (!item) return;

    setDraggedIndex(index);
    setDragOverIndex(null);

    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.id);
    }
  }

  function handleDragOver(event, index) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDragLeave(event) {
    if (event?.currentTarget?.contains(event?.relatedTarget)) return;
    setDragOverIndex(null);
  }

  function handleDrop(dropIndex, event) {
    event.preventDefault();
    event.stopPropagation();

    const draggedId = event?.dataTransfer?.getData("text/plain");
    const currentItems = imageItemsRef.current;
    let sourceIndex = draggedId
      ? currentItems.findIndex((item) => item.id === draggedId)
      : draggedIndex;

    if (
      !Number.isInteger(sourceIndex) ||
      sourceIndex < 0 ||
      sourceIndex >= currentItems.length
    ) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const targetIndex = dropIndex < 0 ? 0 : Math.min(dropIndex, currentItems.length - 1);

    if (sourceIndex !== targetIndex) {
      const next = [...currentItems];
      const [movedItem] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedItem);
      imageItemsRef.current = next;
      setImageItems(next);
      setMessage(
        targetIndex === 0
          ? "Cover media changed. Click Update project to save it."
          : "Media order changed. Click Update project to save it."
      );
      setError("");
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function setCurrentImageAsCover(index) {
    const currentItems = imageItemsRef.current;
    if (!Number.isInteger(index) || index < 0 || index >= currentItems.length) return;

    if (index === 0) {
      setMessage("This media is already the cover.");
      setError("");
      return;
    }

    const next = [...currentItems];
    const [selectedImage] = next.splice(index, 1);
    next.unshift(selectedImage);
    imageItemsRef.current = next;
    setImageItems(next);
    setMessage("Cover selected. Click Update project to save the new cover.");
    setError("");
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function moveCurrentImage(index, direction) {
    setImageItems((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  function removeCurrentImage(index) {
    setImageItems((current) => {
      const item = current[index];

      if (item?.type === "new" && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  function clearCurrentImages() {
    setImageItems((current) => {
      current.forEach((item) => {
        if (item?.type === "new" && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

      return [];
    });

    setDraggedIndex(null);
  }

  async function deleteStorageUrls(urls) {
    const paths = urls.map(getStoragePathFromUrl).filter(Boolean);

    if (paths.length === 0) {
      return { error: null };
    }

    return await supabase.storage.from(BUCKET).remove(paths);
  }

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setError("This email is not authorized to access the dashboard.");
      setLoading(false);
      return;
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      setError("You are not authorized to access this dashboard.");
      setLoading(false);
      return;
    }

    setUser(data.user);
    setPassword("");
    setMessage("Signed in successfully.");
    setLoading(false);
  }

  async function handleSaveProject(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
      setError("Please sign in with your authorized admin account.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a project title.");
      return;
    }

    if (imageItems.length > 10) {
      setError("A project can have up to 10 media files in total.");
      return;
    }

    for (const item of imageItems) {
      if (item.type !== "new") continue;

      const fileType = item.file.type;

      if (![...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(fileType)) {
        setError("Please use JPG, PNG, WebP images, or MP4/WebM/MOV/OGG videos only.");
        return;
      }

      const isVideo = item.mediaType === "video";
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

      if (item.file.size > maxSize) {
        setError(
          `The ${isVideo ? "video" : "image"} "${item.file.name}" is larger than ${
            isVideo ? "50 MB" : "8 MB"
          }.`
        );
        return;
      }
    }

    setSaving(true);

    const uploadedPaths = [];
    const nextImageUrls = [];
    const projectId = editingProjectId;

    try {
      for (const item of imageItems) {
        if (item.type === "existing") {
          nextImageUrls.push(item.url);
          continue;
        }

        const file = item.file;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

        if (uploadError) {
          throw new Error(`Media upload failed: ${uploadError.message}`);
        }

        uploadedPaths.push(path);

        const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        nextImageUrls.push(publicData.publicUrl);
      }

      if (projectId) {
        const { data: updatedProject, error: updateError } = await supabase
          .from("portfolio_projects")
          .update({
            title: title.trim(),
            category,
            description: description.trim(),
            image_urls: nextImageUrls,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Project could not be updated: ${updateError.message}`);
        }

        setProjects((current) =>
          current.map((item) => (item.id === projectId ? updatedProject : item))
        );

        const removedUrls = originalImageUrls.filter(
          (url) => !nextImageUrls.includes(url)
        );

        if (removedUrls.length > 0) {
          const { error: storageError } = await deleteStorageUrls(removedUrls);

          if (storageError) {
            setMessage(
              "Project updated, but some removed media files could not be deleted from storage."
            );
          } else {
            setMessage("Project updated successfully.");
          }
        } else {
          setMessage("Project updated successfully.");
        }

        resetForm();
        return;
      }

      const { data: newProject, error: insertError } = await supabase
        .from("portfolio_projects")
        .insert({
          title: title.trim(),
          category,
          description: description.trim(),
          image_urls: nextImageUrls,
          is_published: false,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Project could not be saved: ${insertError.message}`);
      }

      setProjects((current) => [newProject, ...current]);
      resetForm();
      setMessage("Project saved as a draft. Publish it when you're ready.");
    } catch (err) {
      setError(err.message || "Something went wrong.");

      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from(BUCKET)
          .remove(uploadedPaths);

        if (cleanupError) {
          console.error("Uploaded media cleanup failed:", cleanupError);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(project) {
    setError("");
    setMessage("");
    setBusyId(project.id);

    const nextPublishedState = !project.is_published;

    const { data, error: updateError } = await supabase
      .from("portfolio_projects")
      .update({ is_published: nextPublishedState })
      .eq("id", project.id)
      .select()
      .single();

    if (updateError) {
      setError(`Could not update project: ${updateError.message}`);
    } else {
      setProjects((current) =>
        current.map((item) => (item.id === project.id ? data : item))
      );

      setMessage(
        nextPublishedState ? "Project published." : "Project returned to draft."
      );
    }

    setBusyId(null);
  }

  async function handleDelete(project) {
    const confirmed = window.confirm(
      `Delete "${project.title}" permanently? This cannot be undone.`
    );

    if (!confirmed) return;

    if (editingProjectId === project.id) {
      resetForm();
    }

    setError("");
    setMessage("");
    setBusyId(project.id);

    const { error: deleteError } = await supabase
      .from("portfolio_projects")
      .delete()
      .eq("id", project.id);

    if (deleteError) {
      setError(`Could not delete project: ${deleteError.message}`);
      setBusyId(null);
      return;
    }

    setProjects((current) => current.filter((item) => item.id !== project.id));

    const paths = (project.image_urls ?? [])
      .map(getStoragePathFromUrl)
      .filter(Boolean);

    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove(paths);

      if (storageError) {
        setMessage("Project deleted, but some media files could not be removed from storage.");
      } else {
        setMessage("Project and its media deleted.");
      }
    } else {
      setMessage("Project deleted.");
    }

    setBusyId(null);
  }

  async function handleLogout() {
    setError("");
    setMessage("");

    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(`Could not sign out: ${logoutError.message}`);
      return;
    }

    setUser(null);
    setProjects([]);
    resetForm();
    setBusyId(null);
    setMessage("");
  }

  if (checkingSession) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <p>Checking your secure session...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={styles.page}>
        <div
          style={{
            ...styles.container,
            maxWidth: "440px",
            paddingTop: "40px",
          }}
        >
          <div style={styles.card}>
            <p style={{ ...styles.muted, letterSpacing: "2px" }}>PRIVATE WORKSPACE</p>

            <h1 style={{ marginBottom: "8px" }}>Portfolio Admin</h1>

            <p style={styles.muted}>
              Sign in to manage your portfolio projects and preview media.
            </p>

            {error && <div style={styles.error}>{error}</div>}

            <form onSubmit={handleLogin}>
              <label htmlFor="admin-email" style={styles.label}>
                Email address
              </label>

              <input
                id="admin-email"
                type="email"
                style={styles.input}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />

              <label htmlFor="admin-password" style={styles.label}>
                Password
              </label>

              <input
                id="admin-password"
                type="password"
                style={styles.input}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="submit"
                style={{ ...styles.button, width: "100%" }}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in securely"}
              </button>
            </form>

            <p style={{ marginTop: "24px" }}>
              <a href="/" style={{ color: "#315c42" }}>
                ← Back to portfolio
              </a>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div>
            <p style={{ ...styles.muted, letterSpacing: "2px" }}>PRIVATE WORKSPACE</p>

            <h1 style={{ margin: "8px 0" }}>Portfolio Dashboard</h1>

            <p style={styles.muted}>Signed in as {user.email}</p>
          </div>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={handleLogout}
          >
            Sign out
          </button>
        </header>

        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.message}>{message}</div>}

        <section style={styles.card}>
          <h2 style={{ marginTop: 0 }}>
            {editingProjectId ? "Edit Portfolio Project" : "Add a Portfolio Project"}
          </h2>

          {editingProjectId && (
            <div style={styles.message}>
              You are editing an existing project. Update the details below and
              click Update.
            </div>
          )}

          <p style={styles.muted}>
            New projects start as drafts. You can publish them after checking
            their details and media.
          </p>

          <form onSubmit={handleSaveProject}>
            <label htmlFor="project-title" style={styles.label}>
              Project title
            </label>

            <input
              id="project-title"
              style={styles.input}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Monthly Sales Dashboard"
              maxLength={150}
              required
            />

            <label htmlFor="project-category" style={styles.label}>
              Category
            </label>

            <select
              id="project-category"
              style={styles.input}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label htmlFor="project-description" style={styles.label}>
              Description
            </label>

            <textarea
              id="project-description"
              style={{
                ...styles.input,
                minHeight: "120px",
                resize: "vertical",
              }}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the project, the tools used, and the result."
              maxLength={3000}
            />

            <label htmlFor="project-images" style={styles.label}>
              Preview media
            </label>

            <input
              id="project-images"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,video/ogg"
              multiple
              style={styles.input}
              onChange={handleImageUpload}
            />

            <p style={styles.muted}>
              Select up to 10 JPG, PNG, WebP images, or MP4/WebM/MOV/OGG videos.
              Drag the cards below to reorder them. The first media item becomes
              the cover on the public site.
            </p>

            {imageItems.length > 0 && (
              <div style={{ marginTop: "16px", marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={styles.label}>Manage & Reorder Media</label>

                  <button
                    type="button"
                    style={styles.dangerButton}
                    onClick={clearCurrentImages}
                  >
                    Remove all current media
                  </button>
                </div>

                <p style={{ ...styles.muted, marginBottom: "12px" }}>
                  🖱️ Drag and drop any media item to change its position, or click{" "}
                  <strong>Set as Cover</strong>.
                </p>

                <div
                  onDragOver={(event) => handleDragOver(event, -1)}
                  onDragLeave={handleDragLeave}
                  onDrop={(event) => handleDrop(0, event)}
                  style={{
                    padding: "12px 14px",
                    marginBottom: "12px",
                    borderRadius: "10px",
                    border:
                      dragOverIndex === -1
                        ? "2px solid #315c42"
                        : "1px dashed #b8c8ba",
                    background: dragOverIndex === -1 ? "#edf5ec" : "#fafaf7",
                    color: "#315c42",
                    fontSize: "13px",
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  Drop here to make this image the cover
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {imageItems.map((item, index) => {
                    const isCover = index === 0;
                    const isDragging = draggedIndex === index;
                    const isDropTarget = dragOverIndex === index;
                    const imageUrl =
                      item.type === "existing" ? item.url : item.previewUrl;
                    const isVideo = isVideoItem(item);

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(event) => handleDragStart(index, event)}
                        onDragOver={(event) => handleDragOver(event, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(event) => handleDrop(index, event)}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        style={{
                          position: "relative",
                          border: isCover
                            ? "2px solid #315c42"
                            : isDropTarget
                              ? "2px dashed #315c42"
                              : "1px solid #d7dfd4",
                          borderRadius: "10px",
                          overflow: "hidden",
                          background: isCover ? "#f2f7f3" : "#fff",
                          boxShadow: isCover
                            ? "0 4px 12px rgba(49, 92, 66, 0.15)"
                            : "0 2px 6px rgba(0, 0, 0, 0.04)",
                          opacity: isDragging ? 0.4 : 1,
                          cursor: "grab",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "8px",
                            left: "8px",
                            zIndex: 2,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: isCover ? "#315c42" : "rgba(36, 55, 43, 0.75)",
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {isCover ? "★ #1 COVER" : `#${index + 1}`}
                        </div>

                        <MediaPreview
                          url={imageUrl}
                          title={title || "Media"}
                          index={index}
                          isVideo={isVideo}
                        />

                        <div
                          style={{
                            padding: "8px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            background: isCover ? "#e8efe9" : "#fafaf7",
                            borderTop: "1px solid #e2e8df",
                          }}
                        >
                          {!isCover && (
                            <button
                              type="button"
                              style={{
                                ...styles.secondaryButton,
                                padding: "5px 8px",
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "#315c42",
                                borderColor: "#315c42",
                              }}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setCurrentImageAsCover(index);
                              }}
                            >
                              ★ Set as Cover
                            </button>
                          )}

                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              type="button"
                              style={{
                                ...styles.secondaryButton,
                                flex: 1,
                                padding: "4px",
                                fontSize: "12px",
                              }}
                              onClick={() => moveCurrentImage(index, -1)}
                              disabled={index === 0}
                            >
                              ←
                            </button>

                            <button
                              type="button"
                              style={{
                                ...styles.secondaryButton,
                                flex: 1,
                                padding: "4px",
                                fontSize: "12px",
                              }}
                              onClick={() => moveCurrentImage(index, 1)}
                              disabled={index === imageItems.length - 1}
                            >
                              →
                            </button>

                            <button
                              type="button"
                              style={{
                                ...styles.dangerButton,
                                padding: "4px 8px",
                                fontSize: "12px",
                              }}
                              onClick={() => removeCurrentImage(index)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="submit" style={styles.button} disabled={saving}>
                {saving
                  ? editingProjectId
                    ? "Updating project..."
                    : "Saving project..."
                  : editingProjectId
                    ? "Update project"
                    : "Save as draft"}
              </button>

              {editingProjectId && (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={cancelEditing}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 6px" }}>Your Projects</h2>
              <p style={styles.muted}>
                {projects.length} project(s) in your dashboard
              </p>
            </div>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={loadProjects}
            >
              Refresh
            </button>
          </div>

          {projects.length === 0 ? (
            <p style={styles.muted}>
              No projects yet. Add your first project using the form above.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "18px" }}>
              {projects.map((project) => (
                <article
                  key={project.id}
                  style={{
                    border: "1px solid #e2e8df",
                    borderRadius: "12px",
                    padding: "18px",
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr)",
                    gap: "14px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <h3 style={{ margin: 0 }}>{project.title}</h3>

                      <span
                        style={{
                          fontSize: "12px",
                          padding: "5px 9px",
                          borderRadius: "20px",
                          background: project.is_published ? "#e6f4e8" : "#f1f1eb",
                          color: project.is_published ? "#285c35" : "#686b5f",
                        }}
                      >
                        {project.is_published ? "Published" : "Draft"}
                      </span>
                    </div>

                    <p style={styles.muted}>{project.category}</p>

                    {project.description && (
                      <p style={{ lineHeight: 1.7 }}>{project.description}</p>
                    )}

                    {(project.image_urls ?? []).length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                          gap: "10px",
                          marginTop: "12px",
                        }}
                      >
                        {project.image_urls.map((url, index) => (
                          <div
                            key={`${url}-${index}`}
                            style={{
                              borderRadius: "8px",
                              overflow: "hidden",
                              border: "1px solid #e2e8df",
                            }}
                          >
                            <MediaPreview
                              url={url}
                              title={project.title}
                              index={index}
                              isVideo={isVideoUrl(url)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      disabled={busyId === project.id}
                      onClick={() => startEditing(project)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      style={styles.button}
                      disabled={busyId === project.id}
                      onClick={() => handlePublish(project)}
                    >
                      {busyId === project.id
                        ? "Please wait..."
                        : project.is_published
                          ? "Unpublish"
                          : "Publish"}
                    </button>

                    <button
                      type="button"
                      style={styles.dangerButton}
                      disabled={busyId === project.id}
                      onClick={() => handleDelete(project)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p style={styles.muted}>
          <a href="/" style={{ color: "#315c42" }}>
            ← View public portfolio
          </a>
        </p>
      </div>
    </main>
  );
}