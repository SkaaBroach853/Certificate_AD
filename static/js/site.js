const DEFAULT_BACKGROUNDS = {
  ad_hero_image: "linear-gradient(125deg, #030a16 0%, #021227 52%, #031125 100%)",
  ad_about_image: "linear-gradient(120deg, #101521, #1a2234 50%, #10131c)",
  ad_story_image: "linear-gradient(140deg, #08101d, #12253f 50%, #08101d)",
};

function getStoredBackground(key) {
  const value = localStorage.getItem(key);
  return value && value.trim() ? `url(${value})` : DEFAULT_BACKGROUNDS[key] || DEFAULT_BACKGROUNDS.ad_hero_image;
}

function applyBackgrounds() {
  document.querySelectorAll("[data-bg-key]").forEach((section) => {
    const key = section.dataset.bgKey;
    const imageLayer = section.querySelector(".image-layer");
    if (!imageLayer || !key) return;
    imageLayer.style.backgroundImage = getStoredBackground(key);
  });
}

function setupRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.22 }
  );

  document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
}

function smoothAnchorScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId.length < 2) return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initBubbleMenu() {
  const menu = document.querySelector(".bubble-menu");
  const toggle = document.getElementById("bubbleMenuToggle");
  const overlay = document.getElementById("bubbleMenuItems");
  if (!menu || !toggle || !overlay) return;

  const bubbleLinks = Array.from(overlay.querySelectorAll(".pill-link"));
  const labelNodes = bubbleLinks
    .map((link) => link.querySelector(".pill-label"))
    .filter(Boolean);

  let isOpen = false;

  const animateOpen = () => {
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    toggle.classList.add("open");
    toggle.setAttribute("aria-pressed", "true");

    if (!window.gsap) return;
    window.gsap.killTweensOf([...bubbleLinks, ...labelNodes]);
    window.gsap.set(bubbleLinks, { scale: 0, transformOrigin: "50% 50%" });
    window.gsap.set(labelNodes, { y: 24, autoAlpha: 0 });

    bubbleLinks.forEach((bubble, i) => {
      const delay = i * 0.12 + window.gsap.utils.random(-0.04, 0.04);
      const timeline = window.gsap.timeline({ delay });
      timeline.to(bubble, {
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.5)",
      });
      if (labelNodes[i]) {
        timeline.to(
          labelNodes[i],
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.5,
            ease: "power3.out",
          },
          "-=0.44"
        );
      }
    });
  };

  const animateClose = () => {
    toggle.classList.remove("open");
    toggle.setAttribute("aria-pressed", "false");

    if (!window.gsap) {
      overlay.style.display = "none";
      overlay.setAttribute("aria-hidden", "true");
      return;
    }
    window.gsap.killTweensOf([...bubbleLinks, ...labelNodes]);
    window.gsap.to(labelNodes, {
      y: 24,
      autoAlpha: 0,
      duration: 0.2,
      ease: "power3.in",
    });
    window.gsap.to(bubbleLinks, {
      scale: 0,
      duration: 0.2,
      ease: "power3.in",
      onComplete: () => {
        overlay.style.display = "none";
        overlay.setAttribute("aria-hidden", "true");
      },
    });
  };

  const setOpenState = (open) => {
    isOpen = open;
    if (isOpen) animateOpen();
    else animateClose();
  };

  toggle.addEventListener("click", () => setOpenState(!isOpen));
  bubbleLinks.forEach((link) => {
    link.addEventListener("click", () => setOpenState(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) setOpenState(false);
  });

  document.addEventListener("click", (event) => {
    if (!isOpen) return;
    const insideOverlay = overlay.contains(event.target);
    const insideMenu = menu.contains(event.target);
    if (!insideOverlay && !insideMenu) setOpenState(false);
  });
}

function initBorderGlow() {
  const cards = document.querySelectorAll(".border-glow-card");
  if (!cards.length) return;

  cards.forEach((card) => {
    const getCenterOfElement = () => {
      const { width, height } = card.getBoundingClientRect();
      return [width / 2, height / 2];
    };

    const getEdgeProximity = (x, y) => {
      const [cx, cy] = getCenterOfElement();
      const dx = x - cx;
      const dy = y - cy;
      let kx = Infinity;
      let ky = Infinity;
      if (dx !== 0) kx = cx / Math.abs(dx);
      if (dy !== 0) ky = cy / Math.abs(dy);
      return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    };

    const getCursorAngle = (x, y) => {
      const [cx, cy] = getCenterOfElement();
      const dx = x - cx;
      const dy = y - cy;
      if (dx === 0 && dy === 0) return 0;
      const radians = Math.atan2(dy, dx);
      let degrees = (radians * 180) / Math.PI + 90;
      if (degrees < 0) degrees += 360;
      return degrees;
    };

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const edge = getEdgeProximity(x, y);
      const angle = getCursorAngle(x, y);
      card.style.setProperty("--edge-proximity", `${(edge * 100).toFixed(3)}`);
      card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
    });
  });
}

function initDotField(container, options = {}) {
  if (!container) return;

  const {
    dotRadius = 1.5,
    dotSpacing = 14,
    cursorRadius = 500,
    cursorForce = 0.1,
    bulgeOnly = true,
    bulgeStrength = 67,
    glowRadius = 160,
    sparkle = false,
    waveAmplitude = 0,
    gradientFrom = "rgba(125, 211, 252, 0.35)",
    gradientTo = "rgba(147, 197, 253, 0.22)",
    glowColor = "#0a1324",
  } = options;

  const canvas = document.createElement("canvas");
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  const defs = document.createElementNS(svgNS, "defs");
  const radialGradient = document.createElementNS(svgNS, "radialGradient");
  const stopStart = document.createElementNS(svgNS, "stop");
  const stopEnd = document.createElementNS(svgNS, "stop");
  const glow = document.createElementNS(svgNS, "circle");
  const glowId = `dot-field-glow-${Math.random().toString(36).slice(2, 9)}`;
  const TWO_PI = Math.PI * 2;
  const dots = [];
  const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
  const size = { w: 0, h: 0, offsetX: 0, offsetY: 0 };
  let frameCount = 0;
  let engagement = 0;
  let glowOpacity = 0;
  let rafId = 0;
  let resizeTimer = 0;

  radialGradient.setAttribute("id", glowId);
  stopStart.setAttribute("offset", "0%");
  stopStart.setAttribute("stop-color", glowColor);
  stopEnd.setAttribute("offset", "100%");
  stopEnd.setAttribute("stop-color", "transparent");
  radialGradient.appendChild(stopStart);
  radialGradient.appendChild(stopEnd);
  defs.appendChild(radialGradient);
  glow.setAttribute("cx", "-9999");
  glow.setAttribute("cy", "-9999");
  glow.setAttribute("r", String(glowRadius));
  glow.setAttribute("fill", `url(#${glowId})`);
  glow.style.opacity = "0";
  svg.appendChild(defs);
  svg.appendChild(glow);

  container.appendChild(canvas);
  container.appendChild(svg);

  const ctx = canvas.getContext("2d", { alpha: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const updateOffsets = () => {
    const rect = container.getBoundingClientRect();
    size.offsetX = rect.left + window.scrollX;
    size.offsetY = rect.top + window.scrollY;
  };

  const buildDots = (w, h) => {
    dots.length = 0;
    const step = dotRadius + dotSpacing;
    const cols = Math.floor(w / step);
    const rows = Math.floor(h / step);
    const padX = (w % step) / 2;
    const padY = (h % step) / 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ax = padX + col * step + step / 2;
        const ay = padY + row * step + step / 2;
        dots.push({ ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay });
      }
    }
  };

  const doResize = () => {
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size.w = w;
    size.h = h;
    updateOffsets();
    buildDots(w, h);
  };

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(doResize, 100);
  };

  const onMouseMove = (event) => {
    mouse.x = event.pageX - size.offsetX;
    mouse.y = event.pageY - size.offsetY;
  };

  const updateMouseSpeed = () => {
    const dx = mouse.prevX - mouse.x;
    const dy = mouse.prevY - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    mouse.speed += (dist - mouse.speed) * 0.5;
    if (mouse.speed < 0.001) mouse.speed = 0;
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
  };

  const speedInterval = window.setInterval(updateMouseSpeed, 20);

  const tick = () => {
    frameCount += 1;
    const { w, h } = size;
    const len = dots.length;
    const t = frameCount * 0.02;
    const targetEngagement = Math.min(mouse.speed / 5, 1);
    engagement += (targetEngagement - engagement) * 0.06;
    if (engagement < 0.001) engagement = 0;
    glowOpacity += (engagement - glowOpacity) * 0.08;
    glow.setAttribute("cx", String(mouse.x));
    glow.setAttribute("cy", String(mouse.y));
    glow.style.opacity = String(glowOpacity);

    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, gradientFrom);
    grad.addColorStop(1, gradientTo);
    ctx.fillStyle = grad;

    const crSq = cursorRadius * cursorRadius;
    const rad = dotRadius / 2;
    ctx.beginPath();

    for (let i = 0; i < len; i++) {
      const d = dots[i];
      const dx = mouse.x - d.ax;
      const dy = mouse.y - d.ay;
      const distSq = dx * dx + dy * dy;

      if (distSq < crSq && engagement > 0.01) {
        const dist = Math.sqrt(distSq) || 1;
        if (bulgeOnly) {
          const tBulge = 1 - dist / cursorRadius;
          const push = tBulge * tBulge * bulgeStrength * engagement;
          const angle = Math.atan2(dy, dx);
          d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
          d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
        } else {
          const angle = Math.atan2(dy, dx);
          const move = (500 / dist) * (mouse.speed * cursorForce);
          d.vx += Math.cos(angle) * -move;
          d.vy += Math.sin(angle) * -move;
        }
      } else if (bulgeOnly) {
        d.sx += (d.ax - d.sx) * 0.1;
        d.sy += (d.ay - d.sy) * 0.1;
      }

      if (!bulgeOnly) {
        d.vx *= 0.9;
        d.vy *= 0.9;
        d.x = d.ax + d.vx;
        d.y = d.ay + d.vy;
        d.sx += (d.x - d.sx) * 0.1;
        d.sy += (d.y - d.sy) * 0.1;
      }

      let drawX = d.sx;
      let drawY = d.sy;
      if (waveAmplitude > 0) {
        drawY += Math.sin(d.ax * 0.03 + t) * waveAmplitude;
        drawX += Math.cos(d.ay * 0.03 + t * 0.7) * waveAmplitude * 0.5;
      }

      if (sparkle) {
        const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
        const sparkleRadius = (hash % 100) < 3 ? rad * 1.8 : rad;
        ctx.moveTo(drawX + sparkleRadius, drawY);
        ctx.arc(drawX, drawY, sparkleRadius, 0, TWO_PI);
      } else {
        ctx.moveTo(drawX + rad, drawY);
        ctx.arc(drawX, drawY, rad, 0, TWO_PI);
      }
    }

    ctx.fill();
    rafId = window.requestAnimationFrame(tick);
  };

  doResize();
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", updateOffsets, { passive: true });
  window.addEventListener("mousemove", onMouseMove, { passive: true });
  rafId = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(rafId);
    window.clearInterval(speedInterval);
    window.clearTimeout(resizeTimer);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", updateOffsets);
    window.removeEventListener("mousemove", onMouseMove);
  };
}

function initSplashCursor(container, options = {}) {
  if (!container) return;
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const {
    COLOR_UPDATE_SPEED = 10,
    SPLAT_RADIUS = 0.2,
    SPLAT_FORCE = 6000,
    DENSITY_DISSIPATION = 3.5,
    RAINBOW_MODE = true,
    COLOR = "#ff0000",
  } = options;

  const splats = [];
  const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, initialized: false };
  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let animationId = 0;
  let resizeObserver;
  let colorTime = 0;

  const resize = () => {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const parseHexToRgb = (hex) => {
    const clean = hex.replace("#", "");
    const expanded = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const int = parseInt(expanded, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  };

  const rgba = (hex, alpha) => {
    if (typeof hex !== "string" || !hex.startsWith("#")) return hex;
    const { r, g, b } = parseHexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const withAlpha = (color, alpha) => {
    if (color.startsWith("hsla(")) {
      return color.replace(/,\s*1\)$/, `, ${alpha})`);
    }
    if (color.startsWith("rgba(")) {
      return color.replace(/,\s*1\)$/, `, ${alpha})`);
    }
    return color;
  };

  const generateColor = () => {
    if (!RAINBOW_MODE) return rgba(COLOR, 1);
    colorTime += 1 / COLOR_UPDATE_SPEED;
    const hue = (colorTime * 120) % 360;
    return `hsla(${hue}, 100%, 68%, 1)`;
  };

  const addSplat = (x, y, dx, dy) => {
    const speed = Math.hypot(dx, dy);
    const baseRadius = Math.max(width, height) * SPLAT_RADIUS * 0.12;
    splats.push({
      x,
      y,
      dx: dx * 0.012,
      dy: dy * 0.012,
      radius: baseRadius + Math.min(speed * 0.035, 95),
      alpha: 0.22 + Math.min(speed / SPLAT_FORCE, 0.22),
      color: generateColor(),
      life: 1,
    });
    if (splats.length > 24) splats.shift();
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "screen";

    for (let i = splats.length - 1; i >= 0; i--) {
      const splat = splats[i];
      splat.x += splat.dx;
      splat.y += splat.dy;
      splat.dx *= 0.985;
      splat.dy *= 0.985;
      splat.radius *= 1.003;
      splat.life *= 1 - 0.0045 * DENSITY_DISSIPATION;

      if (splat.life < 0.02) {
        splats.splice(i, 1);
        continue;
      }

      const gradient = ctx.createRadialGradient(splat.x, splat.y, 0, splat.x, splat.y, splat.radius);
      gradient.addColorStop(0, withAlpha(splat.color, splat.alpha * splat.life));
      gradient.addColorStop(0.35, withAlpha(splat.color, splat.alpha * 0.55 * splat.life));
      gradient.addColorStop(1, rgba(splat.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(splat.x, splat.y, splat.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    animationId = window.requestAnimationFrame(draw);
  };

  container.addEventListener("pointermove", (event) => {
    const rect = container.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    const ny = (event.clientY - rect.top) / rect.height;
    if (!pointer.initialized) {
      pointer.x = nx;
      pointer.y = ny;
      pointer.px = nx;
      pointer.py = ny;
      pointer.initialized = true;
      return;
    }
    pointer.x = nx;
    pointer.y = ny;
    const dx = (pointer.x - pointer.px) * width;
    const dy = (pointer.y - pointer.py) * height;
    addSplat(pointer.x * width, pointer.y * height, dx, dy);
    pointer.px = pointer.x;
    pointer.py = pointer.y;
  });

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  draw(0);

  return () => {
    window.cancelAnimationFrame(animationId);
    resizeObserver?.disconnect();
    if (canvas.parentNode === container) {
      container.removeChild(canvas);
    }
  };
}

function initTiltedCard(card, options = {}) {
  if (!card) return;
  const inner = card.querySelector(".tilted-card-inner");
  const caption = card.querySelector(".tilted-card-caption");
  if (!inner) return;

  const {
    rotateAmplitude = 12,
    scaleOnHover = 1.08,
  } = options;

  const setDefault = () => {
    if (!window.gsap) {
      inner.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
      if (caption) caption.style.opacity = "0";
      return;
    }
    window.gsap.to(inner, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.45,
      ease: "power3.out",
      transformPerspective: 800,
      transformOrigin: "center center",
    });
    if (caption) {
      window.gsap.to(caption, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;
    const rotateX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotateY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    if (window.gsap) {
      window.gsap.to(inner, {
        rotateX,
        rotateY,
        scale: scaleOnHover,
        duration: 0.25,
        ease: "power3.out",
        transformPerspective: 800,
        transformOrigin: "center center",
      });
      if (caption) {
        window.gsap.to(caption, {
          opacity: 1,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          duration: 0.18,
          ease: "power2.out",
        });
      }
    }
  });

  card.addEventListener("pointerleave", setDefault);
  setDefault();
}

function buildTrailImage(label, palette) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 320">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="100%" stop-color="${palette[1]}"/>
        </linearGradient>
      </defs>
      <rect width="360" height="320" rx="28" fill="url(#g)"/>
      <rect x="28" y="28" width="304" height="264" rx="22" fill="rgba(4,12,24,0.26)" stroke="rgba(255,255,255,0.26)"/>
      <text x="38" y="78" fill="white" font-size="18" font-family="Arial, sans-serif" letter-spacing="4">AD STUDIO</text>
      <text x="38" y="154" fill="white" font-size="44" font-weight="700" font-family="Arial, sans-serif">${label}</text>
      <text x="38" y="196" fill="rgba(255,255,255,0.84)" font-size="18" font-family="Arial, sans-serif">Automated certificate workflow</text>
    </svg>
  `;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

function initImageTrail(shell, trigger) {
  if (!shell) return;
  const images = Array.from(shell.querySelectorAll(".content__img"));
  const inners = Array.from(shell.querySelectorAll(".content__img-inner"));
  if (!images.length) return;

  const art = [
    buildTrailImage("CREATE", ["#0f172a", "#1d4ed8"]),
    buildTrailImage("EVENT", ["#082f49", "#0891b2"]),
    buildTrailImage("DESIGN", ["#111827", "#7c3aed"]),
    buildTrailImage("ISSUE", ["#172554", "#2563eb"]),
    buildTrailImage("EXPORT", ["#0c4a6e", "#0ea5e9"]),
    buildTrailImage("CERTIFY", ["#0f172a", "#334155"]),
  ];

  inners.forEach((node, index) => {
    node.style.backgroundImage = art[index % art.length];
  });

  let zIndex = 1;
  let imgPosition = 0;
  let activeImages = 0;
  let isIdle = true;
  const threshold = 70;
  const mousePos = { x: 0, y: 0 };
  const lastMousePos = { x: 0, y: 0 };
  const cacheMousePos = { x: 0, y: 0 };

  const lerp = (a, b, n) => (1 - n) * a + n * b;
  const distanceBetween = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

  const showNextImage = () => {
    zIndex += 1;
    imgPosition = imgPosition < images.length - 1 ? imgPosition + 1 : 0;
    const img = images[imgPosition];
    const rect = img.getBoundingClientRect();
    activeImages += 1;
    isIdle = false;

    window.gsap.killTweensOf(img);
    window.gsap.killTweensOf(img.firstElementChild);

    window.gsap
      .timeline({
        onComplete: () => {
          activeImages -= 1;
          if (activeImages === 0) isIdle = true;
        },
      })
      .fromTo(
        img,
        {
          opacity: 1,
          scale: 0,
          zIndex,
          x: cacheMousePos.x - rect.width / 2,
          y: cacheMousePos.y - rect.height / 2,
        },
        {
          duration: 0.42,
          ease: "power2.out",
          scale: 1,
          x: mousePos.x - rect.width / 2,
          y: mousePos.y - rect.height / 2,
        },
        0
      )
      .fromTo(
        img.firstElementChild,
        {
          scale: 1.9,
          filter: "brightness(220%)",
        },
        {
          duration: 0.42,
          ease: "power1.out",
          scale: 1,
          filter: "brightness(100%)",
        },
        0
      )
      .to(
        img,
        {
          duration: 0.45,
          ease: "power3.inOut",
          opacity: 0,
          scale: 0.26,
        },
        0.48
      );
  };

  const render = () => {
    const distance = distanceBetween(mousePos, lastMousePos);
    cacheMousePos.x = lerp(cacheMousePos.x, mousePos.x, 0.1);
    cacheMousePos.y = lerp(cacheMousePos.y, mousePos.y, 0.1);

    if (distance > threshold && window.gsap) {
      showNextImage();
      lastMousePos.x = mousePos.x;
      lastMousePos.y = mousePos.y;
    }

    if (isIdle && zIndex !== 1) {
      zIndex = 1;
    }
    window.requestAnimationFrame(render);
  };

  const bindTarget = trigger || shell;

  const handlePointerMove = (event) => {
    const rect = shell.getBoundingClientRect();
    mousePos.x = event.clientX - rect.left;
    mousePos.y = event.clientY - rect.top;
  };

  const initRender = (event) => {
    const rect = shell.getBoundingClientRect();
    mousePos.x = event.clientX - rect.left;
    mousePos.y = event.clientY - rect.top;
    cacheMousePos.x = mousePos.x;
    cacheMousePos.y = mousePos.y;
    window.requestAnimationFrame(render);
    bindTarget.removeEventListener("pointermove", initRender);
  };

  bindTarget.addEventListener("pointermove", handlePointerMove);
  bindTarget.addEventListener("pointermove", initRender);
}

function initCubes(container, options = {}) {
  if (!container) return;
  const {
    gridSize = 8,
    maxAngle = 60,
    radius = 4,
    rippleColor = "#7dd3fc",
    faceColor = "rgba(5, 16, 31, 0.92)",
    autoAnimate = true,
    rippleOnClick = true,
    rippleSpeed = 1.5,
  } = options;

  const scene = document.createElement("div");
  scene.className = "cubes-scene";
  scene.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  scene.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cube = document.createElement("div");
      cube.className = "cube";
      cube.dataset.row = String(row);
      cube.dataset.col = String(col);
      ["top", "bottom", "left", "right", "front", "back"].forEach((face) => {
        const faceNode = document.createElement("div");
        faceNode.className = `cube-face cube-face--${face}`;
        faceNode.style.backgroundColor = faceColor;
        cube.appendChild(faceNode);
      });
      scene.appendChild(cube);
    }
  }
  container.appendChild(scene);

  const cubes = Array.from(scene.querySelectorAll(".cube"));
  let idleTimer = 0;
  let rafId = 0;
  let simPos = { x: Math.random() * gridSize, y: Math.random() * gridSize };
  let simTarget = { x: Math.random() * gridSize, y: Math.random() * gridSize };
  let userActive = false;

  const resetAll = () => {
    cubes.forEach((cube) => {
      window.gsap.to(cube, {
        duration: 0.6,
        rotateX: 0,
        rotateY: 0,
        ease: "power3.out",
      });
    });
  };

  const tiltAt = (rowCenter, colCenter) => {
    cubes.forEach((cube) => {
      const r = Number(cube.dataset.row);
      const c = Number(cube.dataset.col);
      const dist = Math.hypot(r - rowCenter, c - colCenter);
      if (dist <= radius) {
        const pct = 1 - dist / radius;
        const angle = pct * maxAngle;
        window.gsap.to(cube, {
          duration: 0.3,
          ease: "power3.out",
          overwrite: true,
          rotateX: -angle,
          rotateY: angle,
        });
      } else {
        window.gsap.to(cube, {
          duration: 0.6,
          ease: "power3.out",
          overwrite: true,
          rotateX: 0,
          rotateY: 0,
        });
      }
    });
  };

  const runRipple = (clientX, clientY) => {
    if (!rippleOnClick) return;
    const rect = scene.getBoundingClientRect();
    const cellW = rect.width / gridSize;
    const cellH = rect.height / gridSize;
    const colHit = Math.floor((clientX - rect.left) / cellW);
    const rowHit = Math.floor((clientY - rect.top) / cellH);
    const rings = {};

    cubes.forEach((cube) => {
      const r = Number(cube.dataset.row);
      const c = Number(cube.dataset.col);
      const dist = Math.hypot(r - rowHit, c - colHit);
      const ring = Math.round(dist);
      if (!rings[ring]) rings[ring] = [];
      rings[ring].push(...cube.querySelectorAll(".cube-face"));
    });

    Object.keys(rings)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((ring) => {
        const delay = ring * (0.15 / rippleSpeed);
        window.gsap.to(rings[ring], {
          backgroundColor: rippleColor,
          duration: 0.2,
          delay,
          ease: "power3.out",
        });
        window.gsap.to(rings[ring], {
          backgroundColor: faceColor,
          duration: 0.28,
          delay: delay + 0.34,
          ease: "power3.out",
        });
      });
  };

  scene.addEventListener("pointermove", (event) => {
    userActive = true;
    window.clearTimeout(idleTimer);
    const rect = scene.getBoundingClientRect();
    const cellW = rect.width / gridSize;
    const cellH = rect.height / gridSize;
    const colCenter = (event.clientX - rect.left) / cellW;
    const rowCenter = (event.clientY - rect.top) / cellH;
    window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(() => tiltAt(rowCenter, colCenter));
    idleTimer = window.setTimeout(() => {
      userActive = false;
    }, 2600);
  });

  scene.addEventListener("pointerleave", resetAll);
  scene.addEventListener("click", (event) => runRipple(event.clientX, event.clientY));

  if (autoAnimate) {
    const loop = () => {
      if (!userActive) {
        simPos.x += (simTarget.x - simPos.x) * 0.02;
        simPos.y += (simTarget.y - simPos.y) * 0.02;
        tiltAt(simPos.y, simPos.x);
        if (Math.hypot(simPos.x - simTarget.x, simPos.y - simTarget.y) < 0.1) {
          simTarget = {
            x: Math.random() * gridSize,
            y: Math.random() * gridSize,
          };
        }
      }
      window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame(loop);
  }
}

window.addEventListener("storage", (event) => {
  if (event.key && event.key.startsWith("ad_")) {
    applyBackgrounds();
  }
});

applyBackgrounds();
setupRevealAnimations();
smoothAnchorScrolling();
initBubbleMenu();
initBorderGlow();
initSplashCursor(document.getElementById("heroSplash"), {
  COLOR_UPDATE_SPEED: 10,
  SPLAT_RADIUS: 0.2,
  SPLAT_FORCE: 6000,
  DENSITY_DISSIPATION: 3.5,
  RAINBOW_MODE: true,
});
initDotField(document.getElementById("aboutDotField"), {
  dotRadius: 1.5,
  dotSpacing: 10,
  bulgeStrength: 98,
  glowRadius: 240,
  sparkle: false,
  waveAmplitude: 0,
  gradientFrom: "rgba(125, 211, 252, 0.52)",
  gradientTo: "rgba(186, 230, 253, 0.34)",
  glowColor: "#1d4ed8",
});
initTiltedCard(document.getElementById("creatorTiltedCard"), {
  rotateAmplitude: 12,
  scaleOnHover: 1.08,
});
initImageTrail(
  document.getElementById("storyImageTrail"),
  document.getElementById("story")
);
initCubes(document.getElementById("footerCubes"), {
  gridSize: 8,
  maxAngle: 60,
  radius: 4,
  rippleColor: "#38bdf8",
  faceColor: "rgba(5, 16, 31, 0.92)",
  autoAnimate: true,
  rippleOnClick: true,
  rippleSpeed: 1.5,
});
