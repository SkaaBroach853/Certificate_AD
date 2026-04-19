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

function initShapeGrid(container, options = {}) {
  if (!container) return;
  const interactiveRegion = container.closest(".hero") || container.parentElement || container;
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const {
    direction = "diagonal",
    speed = 0.5,
    borderColor = "rgba(255, 255, 255, 0.24)",
    squareSize = 48,
    hoverFillColor = "rgba(255, 255, 255, 0.34)",
    shape = "square",
    hoverTrailAmount = 5,
  } = options;

  let width = 0;
  let height = 0;
  let animationId = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let resizeObserver;
  const gridOffset = { x: 0, y: 0 };
  let hoveredCell = null;
  const trailCells = [];
  const cellOpacities = new Map();
  const isHex = shape === "hexagon";
  const isTri = shape === "triangle";
  const isCircle = shape === "circle";
  const hexHoriz = squareSize * 1.5;
  const hexVert = squareSize * Math.sqrt(3);
  const triHalfW = squareSize / 2;

  const resize = () => {
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const pushTrail = () => {
    if (!hoveredCell || hoverTrailAmount <= 0) return;
    trailCells.unshift({ ...hoveredCell });
    if (trailCells.length > hoverTrailAmount) {
      trailCells.length = hoverTrailAmount;
    }
  };

  const setHoveredCell = (next) => {
    if (!next) {
      pushTrail();
      hoveredCell = null;
      return;
    }
    if (!hoveredCell || hoveredCell.x !== next.x || hoveredCell.y !== next.y) {
      pushTrail();
      hoveredCell = next;
    }
  };

  const drawHex = (cx, cy, size) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const vx = cx + size * Math.cos(angle);
      const vy = cy + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
  };

  const drawCircle = (cx, cy, size) => {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.closePath();
  };

  const drawTriangle = (cx, cy, size, flip) => {
    ctx.beginPath();
    if (flip) {
      ctx.moveTo(cx, cy + size / 2);
      ctx.lineTo(cx + size / 2, cy - size / 2);
      ctx.lineTo(cx - size / 2, cy - size / 2);
    } else {
      ctx.moveTo(cx, cy - size / 2);
      ctx.lineTo(cx + size / 2, cy + size / 2);
      ctx.lineTo(cx - size / 2, cy + size / 2);
    }
    ctx.closePath();
  };

  const updateCellOpacities = () => {
    const targets = new Map();
    if (hoveredCell) {
      targets.set(`${hoveredCell.x},${hoveredCell.y}`, 1);
    }
    if (hoverTrailAmount > 0) {
      trailCells.forEach((cell, index) => {
        const key = `${cell.x},${cell.y}`;
        if (!targets.has(key)) {
          targets.set(key, (trailCells.length - index) / (trailCells.length + 1));
        }
      });
    }
    targets.forEach((_, key) => {
      if (!cellOpacities.has(key)) {
        cellOpacities.set(key, 0);
      }
    });
    cellOpacities.forEach((opacity, key) => {
      const target = targets.get(key) || 0;
      const next = opacity + (target - opacity) * 0.1;
      if (next < 0.003) cellOpacities.delete(key);
      else cellOpacities.set(key, next);
    });
  };

  const drawGrid = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(2, 10, 22, 0.08)";
    ctx.fillRect(0, 0, width, height);

    if (isHex) {
      const colShift = Math.floor(gridOffset.x / hexHoriz);
      const offsetX = ((gridOffset.x % hexHoriz) + hexHoriz) % hexHoriz;
      const offsetY = ((gridOffset.y % hexVert) + hexVert) % hexVert;
      const cols = Math.ceil(width / hexHoriz) + 3;
      const rows = Math.ceil(height / hexVert) + 3;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const cx = col * hexHoriz + offsetX;
          const cy = row * hexVert + ((col + colShift) % 2 !== 0 ? hexVert / 2 : 0) + offsetY;
          const key = `${col},${row}`;
          const alpha = cellOpacities.get(key);
          if (alpha) {
            ctx.globalAlpha = alpha;
            drawHex(cx, cy, squareSize);
            ctx.fillStyle = hoverFillColor;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          drawHex(cx, cy, squareSize);
          ctx.strokeStyle = borderColor;
          ctx.stroke();
        }
      }
    } else if (isTri) {
      const colShift = Math.floor(gridOffset.x / triHalfW);
      const rowShift = Math.floor(gridOffset.y / squareSize);
      const offsetX = ((gridOffset.x % triHalfW) + triHalfW) % triHalfW;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
      const cols = Math.ceil(width / triHalfW) + 4;
      const rows = Math.ceil(height / squareSize) + 4;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const cx = col * triHalfW + offsetX;
          const cy = row * squareSize + squareSize / 2 + offsetY;
          const flip = ((col + colShift + row + rowShift) % 2 + 2) % 2 !== 0;
          const key = `${col},${row}`;
          const alpha = cellOpacities.get(key);
          if (alpha) {
            ctx.globalAlpha = alpha;
            drawTriangle(cx, cy, squareSize, flip);
            ctx.fillStyle = hoverFillColor;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          drawTriangle(cx, cy, squareSize, flip);
          ctx.strokeStyle = borderColor;
          ctx.stroke();
        }
      }
    } else {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
      const cols = Math.ceil(width / squareSize) + 3;
      const rows = Math.ceil(height / squareSize) + 3;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const key = `${col},${row}`;
          const alpha = cellOpacities.get(key);
          const cx = col * squareSize + squareSize / 2 + offsetX;
          const cy = row * squareSize + squareSize / 2 + offsetY;
          const sx = col * squareSize + offsetX;
          const sy = row * squareSize + offsetY;
          if (alpha) {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = hoverFillColor;
            if (isCircle) {
              drawCircle(cx, cy, squareSize);
              ctx.fill();
            } else {
              ctx.fillRect(sx, sy, squareSize, squareSize);
            }
            ctx.globalAlpha = 1;
          }
          ctx.strokeStyle = borderColor;
          if (isCircle) {
            drawCircle(cx, cy, squareSize);
            ctx.stroke();
          } else {
            ctx.strokeRect(sx, sy, squareSize, squareSize);
          }
        }
      }
    }

    const vignette = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.sqrt(width ** 2 + height ** 2) / 2);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.26)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  };

  const animate = () => {
    const effectiveSpeed = Math.max(speed, 0.1);
    const wrapX = isHex ? hexHoriz * 2 : squareSize;
    const wrapY = isHex ? hexVert : isTri ? squareSize * 2 : squareSize;

    switch (direction) {
      case "right":
        gridOffset.x = (gridOffset.x - effectiveSpeed + wrapX) % wrapX;
        break;
      case "left":
        gridOffset.x = (gridOffset.x + effectiveSpeed + wrapX) % wrapX;
        break;
      case "up":
        gridOffset.y = (gridOffset.y + effectiveSpeed + wrapY) % wrapY;
        break;
      case "down":
        gridOffset.y = (gridOffset.y - effectiveSpeed + wrapY) % wrapY;
        break;
      case "diagonal":
        gridOffset.x = (gridOffset.x - effectiveSpeed + wrapX) % wrapX;
        gridOffset.y = (gridOffset.y - effectiveSpeed + wrapY) % wrapY;
        break;
      default:
        break;
    }

    updateCellOpacities();
    drawGrid();
    animationId = window.requestAnimationFrame(animate);
  };

  const handlePointerMove = (event) => {
    const rect = container.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!inside) {
      setHoveredCell(null);
      return;
    }

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (isHex) {
      const colShift = Math.floor(gridOffset.x / hexHoriz);
      const offsetX = ((gridOffset.x % hexHoriz) + hexHoriz) % hexHoriz;
      const offsetY = ((gridOffset.y % hexVert) + hexVert) % hexVert;
      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;
      const col = Math.round(adjustedX / hexHoriz);
      const rowOffset = (col + colShift) % 2 !== 0 ? hexVert / 2 : 0;
      const row = Math.round((adjustedY - rowOffset) / hexVert);
      setHoveredCell({ x: col, y: row });
    } else if (isTri) {
      const offsetX = ((gridOffset.x % triHalfW) + triHalfW) % triHalfW;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;
      setHoveredCell({
        x: Math.round(adjustedX / triHalfW),
        y: Math.floor(adjustedY / squareSize),
      });
    } else if (isCircle) {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;
      setHoveredCell({
        x: Math.round(adjustedX / squareSize),
        y: Math.round(adjustedY / squareSize),
      });
    } else {
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
      const adjustedX = mouseX - offsetX;
      const adjustedY = mouseY - offsetY;
      setHoveredCell({
        x: Math.floor(adjustedX / squareSize),
        y: Math.floor(adjustedY / squareSize),
      });
    }
  };

  const handlePointerLeave = () => {
    setHoveredCell(null);
  };

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  interactiveRegion.addEventListener("pointerleave", handlePointerLeave);
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  animate();

  return () => {
    window.cancelAnimationFrame(animationId);
    resizeObserver?.disconnect();
    window.removeEventListener("pointermove", handlePointerMove);
    interactiveRegion.removeEventListener("pointerleave", handlePointerLeave);
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
initShapeGrid(document.getElementById("heroShapeGrid"), {
  speed: 0.45,
  squareSize: 52,
  direction: "diagonal",
  borderColor: "rgba(255, 255, 255, 0.24)",
  hoverFillColor: "rgba(255, 255, 255, 0.38)",
  shape: "square",
  hoverTrailAmount: 6,
});
initDotField(document.getElementById("aboutDotField"), {
  dotRadius: 2.2,
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
