import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import { supabase } from "./supabaseClient";

const categories = [
  "All Work",
  "Graphic Design",
  "Excel & Data",
  "Tally & Accounts",
  "Word Documents",
];

function ProjectImageGallery({ project }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const closeButtonRef = useRef(null);

  const images =
    project.images?.length > 0
      ? project.images
      : project.image
        ? [project.image]
        : [];

  useEffect(() => {
    if (!isViewerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsViewerOpen(false);
        return;
      }

      if (images.length > 1 && event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveImageIndex((current) =>
          current === 0 ? images.length - 1 : current - 1
        );
      }

      if (images.length > 1 && event.key === "ArrowRight") {
        event.preventDefault();
        setActiveImageIndex((current) =>
          current === images.length - 1 ? 0 : current + 1
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isViewerOpen, images.length]);

  if (images.length === 0) {
    return null;
  }

  const previousImage = () => {
    setActiveImageIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  };

  const nextImage = () => {
    setActiveImageIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  };

  return (
    <div className="project-image-gallery">
      <img
        className="project-image"
        src={images[activeImageIndex]}
        alt={`${project.title} — image ${activeImageIndex + 1}`}
        loading="lazy"
        role="button"
        tabIndex={0}
        aria-label={`Enlarge ${project.title} image ${activeImageIndex + 1}`}
        onClick={() => setIsViewerOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsViewerOpen(true);
          }
        }}
        style={{ cursor: "zoom-in" }}
      />

      {images.length > 1 && (
        <div className="gallery-controls">
          <button
            type="button"
            onClick={previousImage}
            aria-label="Previous image"
          >
            ← Previous
          </button>

          <span>
            {activeImageIndex + 1} / {images.length}
          </span>

          <button
            type="button"
            onClick={nextImage}
            aria-label="Next image"
          >
            Next →
          </button>
        </div>
      )}

      {isViewerOpen &&
        createPortal(
          <div
            className="image-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${project.title} image viewer`}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setIsViewerOpen(false);
              }
            }}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="lightbox-close"
              onClick={() => setIsViewerOpen(false)}
              aria-label="Close enlarged image"
            >
              ×
            </button>

            {images.length > 1 && (
              <button
                type="button"
                className="lightbox-prev"
                onClick={previousImage}
                aria-label="Previous image"
              >
                ‹
              </button>
            )}

            <img
              className="lightbox-image"
              src={images[activeImageIndex]}
              alt={`${project.title} — enlarged image ${
                activeImageIndex + 1
              } of ${images.length}`}
            />

            {images.length > 1 && (
              <button
                type="button"
                className="lightbox-next"
                onClick={nextImage}
                aria-label="Next image"
              >
                ›
              </button>
            )}

            {images.length > 1 && (
              <span className="lightbox-counter">
                {activeImageIndex + 1} / {images.length}
              </span>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

function App() {
  const [activeCategory, setActiveCategory] = useState("All Work");
  const [search, setSearch] = useState("");
  const [publishedProjects, setPublishedProjects] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPublishedProjects() {
      const { data, error } = await supabase
        .from("portfolio_projects")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Could not load published projects:", error.message);
        return;
      }

      if (!cancelled) {
        setPublishedProjects(data ?? []);
      }
    }

    loadPublishedProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const allProjects = publishedProjects.map((project) => ({
    id: project.id,
    title: project.title,
    category: project.category,
    description: project.description || "",
    label: project.category?.toUpperCase() || "PROJECT",
    image: project.image_urls?.[0] || "",
    images: project.image_urls || [],
  }));

  const filteredProjects = allProjects.filter((project) => {
    const matchesCategory =
      activeCategory === "All Work" ||
      project.category === activeCategory;

    const searchText = [
      project.title,
      project.category,
      project.description,
      project.label,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchText.includes(
      search.trim().toLowerCase()
    );

    return matchesCategory && matchesSearch;
  });

  function scrollToWork() {
    document.getElementById("work")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  return (
    <div className="portfolio">
      {/* HEADER */}
      <header className="site-header">
        <a className="brand" href="#home" aria-label="ASHIQ home">
          <span className="brand-mark">A.</span>
          <span>Small Business Design</span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#work">My Work</a>
          <a href="#services">Services</a>
          <a href="#about">About</a>
          <a href="#contact" className="nav-contact">
            Contact Me ↗
          </a>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="availability">
              <span className="availability-dot"></span>
              OPEN TO OPPORTUNITIES
            </div>

            <p className="eyebrow">
              CREATIVE WORK. SMART SOLUTIONS.
            </p>

            <h1>
              Turning ideas into
              <br />
              <span>professional work.</span>
            </h1>

            <p className="hero-description">
              I help businesses create professional designs, organised
              spreadsheets, and reliable business documents. My focus
              is on creativity, accuracy, and work that serves a clear
              purpose.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={scrollToWork}
              >
                Explore My Work <span>↗</span>
              </button>

              <a className="secondary-button" href="#contact">
                Let's Connect
              </a>
            </div>

            <div className="hero-stats">
              <div>
                <strong>04</strong>
                <span>Service Areas</span>
              </div>

              <div>
                <strong>
                  {publishedProjects.length.toString().padStart(2, "0")}
                </strong>
                <span>Portfolio Projects</span>
              </div>

              <div>
                <strong>100%</strong>
                <span>Attention to Detail</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-glow"></div>

            <div className="floating-card card-top">
              <span className="floating-icon">✳</span>
              <div>
                <strong>Creative Design</strong>
                <small>Ideas made visual</small>
              </div>
            </div>

            <div className="showcase-card">
              <div className="showcase-top">
                <span>ASHIQ'S WORKSPACE</span>
                <span className="showcase-dots">•••</span>
              </div>

              <div className="showcase-art">
                <span className="art-small">THINK. CREATE.</span>
                <h2>
                  MAKE IT
                  <br />
                  MATTER.
                </h2>
                <div className="art-circle"></div>
                <span className="art-bottom">
                  CREATIVITY MEETS PRECISION
                </span>
              </div>

              <div className="showcase-footer">
                <div>
                  <span className="mini-icon">▦</span>
                  <span>Design</span>
                </div>

                <div>
                  <span className="mini-icon">▤</span>
                  <span>Data</span>
                </div>

                <div>
                  <span className="mini-icon">▧</span>
                  <span>Documents</span>
                </div>
              </div>
            </div>

            <div className="floating-card card-bottom">
              <span className="excel-icon">✓</span>
              <div>
                <strong>Organised & Accurate</strong>
                <small>Details make the difference</small>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="services-section" id="services">
          <div className="section-heading">
            <p className="eyebrow">WHAT I CAN DO</p>
            <h2>Skills that bring value.</h2>
            <p>
              A combination of creativity, organisation, and practical
              digital skills.
            </p>
          </div>

          <div className="services-grid">
            <article className="service-card">
              <div className="service-icon design-icon">✳</div>
              <h3>Graphic Design</h3>
              <p>
                Menus, promotional posters, sale flyers, and social
                media graphics.
              </p>
              <a
                href="#work"
                onClick={() =>
                  setActiveCategory("Graphic Design")
                }
              >
                View design work ↗
              </a>
            </article>

            <article className="service-card">
              <div className="service-icon excel-service-icon">
                ▦
              </div>
              <h3>Excel & Data</h3>
              <p>
                XLOOKUP, PivotTables, data organisation, reports,
                and dashboards.
              </p>
              <a
                href="#work"
                onClick={() => setActiveCategory("Excel & Data")}
              >
                View data work ↗
              </a>
            </article>

            <article className="service-card">
              <div className="service-icon accounts-icon">₹</div>
              <h3>Tally & Accounts</h3>
              <p>
                Bookkeeping support, invoice preparation, and
                organised accounting records.
              </p>
              <a href="#contact">Discuss accounting work ↗</a>
            </article>

            <article className="service-card">
              <div className="service-icon word-icon">W</div>
              <h3>Word Documents</h3>
              <p>
                Professional reports, formatted documents, and
                organised business content.
              </p>
              <a
                href="#work"
                onClick={() =>
                  setActiveCategory("Word Documents")
                }
              >
                View document work ↗
              </a>
            </article>
          </div>
        </section>

        {/* PORTFOLIO */}
        <section className="work-section" id="work">
          <div className="work-heading">
            <div>
              <p className="eyebrow">SELECTED PROJECTS</p>
              <h2>A closer look at my work.</h2>
              <p className="section-description">
                Explore examples of my design and digital work.
              </p>
            </div>

            <div className="project-count">
              <strong>
                {filteredProjects.length.toString().padStart(2, "0")}
              </strong>
              <span>PROJECTS</span>
            </div>
          </div>

          <div className="project-controls">
            <div className="category-filters">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={
                    activeCategory === category
                      ? "filter-button active"
                      : "filter-button"
                  }
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={activeCategory === category}
                >
                  {category}
                </button>
              ))}
            </div>

            <input
              className="project-search"
              type="search"
              placeholder="Search projects..."
              aria-label="Search projects"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="projects-grid">
            {filteredProjects.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-preview">
                  {project.images?.length > 0 || project.image ? (
                    <ProjectImageGallery project={project} />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        minHeight: "240px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        background: "#f5f1e8",
                        color: "#2f3e31",
                      }}
                    >
                      <span className="preview-label">{project.label}</span>

                      <h3
                        style={{
                          margin: "34px 0 8px",
                          fontFamily: "var(--serif)",
                          fontSize: "clamp(24px, 2.8vw, 32px)",
                          lineHeight: 1.1,
                        }}
                      >
                        {project.title}
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          color: "#5f665b",
                          fontSize: "13px",
                          lineHeight: 1.7,
                        }}
                      >
                        {project.description ||
                          "No preview image uploaded yet."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="project-info">
                  <div>
                    <span className="project-category">
                      {project.category}
                    </span>

                    <h3>{project.title}</h3>

                    <p>{project.description}</p>
                  </div>

                  <span className="project-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              </article>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="empty-state">
              <h3>No projects found</h3>
              <p>
                Try a different search or select another category.
              </p>

              <button
                className="primary-button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All Work");
                }}
              >
                Show All Projects
              </button>
            </div>
          )}

          <p className="demo-note">
            Some portfolio visuals are illustrative demonstrations.
            Sample figures are not verified business records.
          </p>
        </section>

        {/* ABOUT */}
        <section className="about-section" id="about">
          <div className="about-mark">A.</div>

          <div className="about-content">
            <p className="eyebrow">A LITTLE ABOUT ME</p>

            <h2>
              Thoughtful work.
              <br />
              <span>Practical results.</span>
            </h2>

            <p>
              I help businesses create professional designs,
              organised spreadsheets, and reliable business
              documents. I enjoy combining creativity with
              technology and value clarity, accuracy, and attention
              to detail.
            </p>

            <a className="text-link" href="#contact">
              Let's work together ↗
            </a>
          </div>

          <div className="about-values">
            <div>
              <span>01</span>
              <strong>Attention to detail</strong>
              <p>Careful, organised work.</p>
            </div>

            <div>
              <span>02</span>
              <strong>Clear communication</strong>
              <p>Simple and straightforward.</p>
            </div>

            <div>
              <span>03</span>
              <strong>Continuous learning</strong>
              <p>Always improving my skills.</p>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="contact-section" id="contact">
          <div className="contact-content">
            <p className="eyebrow">HAVE A PROJECT IN MIND?</p>

            <h2>
              Let's create
              <br />
              something <span>great.</span>
            </h2>

            <p>
              Have a design, spreadsheet, accounting, or document
              project in mind? Get in touch to discuss your
              requirements.
            </p>

            <a
              className="primary-button contact-button"
              href="mailto:spreedow@gmail.com?subject=Portfolio%20Project%20Enquiry"
            >
              Email Me <span>↗</span>
            </a>

            <p className="email-note">
              Contact me at spreedow@gmail.com
            </p>
          </div>

          <div className="contact-decoration">
            <div className="contact-circle circle-one"></div>
            <div className="contact-circle circle-two"></div>

            <div className="contact-center">
              <span>LET'S</span>
              <strong>CONNECT</strong>
              <span>↗</span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="site-footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-mark">A.</span>
          <span>Small Business Design</span>
        </a>

        <p>ASHIQ · Creative work. Practical solutions.</p>

        <a href="#home" className="back-to-top">
          Back to top ↑
        </a>
      </footer>
    </div>
  );
}

export default App;