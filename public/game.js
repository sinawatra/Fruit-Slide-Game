class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.score = 0;
    this.lives = 3;
    this.combo = 1;
    this.comboTimer = 0;
    this.maxComboTimer = 3000;
    this.gameActive = false;
    this.fruits = [];
    this.slices = [];
    this.particles = [];
    this.powerups = [];
    this.activePowerups = {
      freeze: false,
      double: false,
      magnet: false,
    };
    this.powerupDuration = 5000; // 5 seconds
    this.powerupTimers = {
      freeze: 0,
      double: 0,
      magnet: 0,
    };
    this.lastFrameTime = 0;
    this.spawnInterval = 1500; // Faster spawning for more action
    this.lastSpawnTime = 0;
    this.images = {};
    this.sounds = {};
    this.slicePoints = []; // Track slice points for better hit detection
    this.fruitSliced = 0;
    //this.criticalHits = 0; // Removed as critical hit logic is simplified
    this.achievements = {
      slice10: false,
      combo5: false,
      score100: false,
      //critical: false, // Removed as critical hit logic is simplified
    };
    this.playerLevel = 1;
    this.xpToNextLevel = 100;
    this.currentXp = 0;
    this.backgroundParticles = [];
    this.createBackgroundParticles();
    this.highScores = [];
    this.maxHighScores = 10;
    this.loadHighScores();
  }

  // Add this debugging function at the top of the Game class, right after the constructor
  debug(message) {
    console.log(`[Game Debug] ${message}`);
  }

  loadHighScores() {
    const savedScores = localStorage.getItem("fruitSliceHighScores");
    this.highScores = savedScores ? JSON.parse(savedScores) : [];
  }

  saveHighScores() {
    localStorage.setItem("fruitSliceHighScores", JSON.stringify(this.highScores));
  }

  isHighScore(score) {
    if (this.highScores.length < this.maxHighScores) return true;
    return score > this.highScores[this.highScores.length - 1].score;
  }

  addHighScore(name, score, level) {
    const newScore = {
      name: name || "Anonymous",
      score,
      level,
      date: new Date().toISOString(),
    };

    this.highScores.push(newScore);
    this.highScores.sort((a, b) => b.score - a.score);

    if (this.highScores.length > this.maxHighScores) {
      this.highScores = this.highScores.slice(0, this.maxHighScores);
    }

    this.saveHighScores();
    return this.highScores.findIndex((s) => s === newScore) + 1; // Return rank
  }

  displayHighScores(elementId, limit = this.maxHighScores) {
    const container = document.getElementById(elementId);
    container.innerHTML = "";

    const scoresToShow = this.highScores.slice(0, limit);

    if (scoresToShow.length === 0) {
      container.innerHTML = '<div class="high-score-entry">No high scores yet!</div>';
      return;
    }

    scoresToShow.forEach((score, index) => {
      const entry = document.createElement("div");
      entry.className = "high-score-entry";

      // Format date (though not displayed in this innerHTML)
      const scoreDate = new Date(score.date);
      const dateStr = scoreDate.toLocaleDateString();

      entry.innerHTML = `
            <div class="high-score-rank">${index + 1}</div>
            <div class="high-score-name">${score.name}</div>
            <div class="high-score-score">${score.score}</div>
        `;

      container.appendChild(entry);
    });
  }

  async init() {
    this.debug("Initializing game...");

    try {
      // Load fruit images
      await this.loadImages();

      // Load sounds
      await this.loadSounds();

      // Set canvas size
      this.resizeCanvas();
      window.addEventListener("resize", () => this.resizeCanvas());

      // Event listeners
      this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
      this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
      this.canvas.addEventListener("mouseup", () => this.handleMouseUp());
      this.canvas.addEventListener("touchstart", (e) => this.handleTouchStart(e));
      this.canvas.addEventListener("touchmove", (e) => this.handleTouchMove(e));
      this.canvas.addEventListener("touchend", () => this.handleTouchEnd());

      // UI elements
      document.getElementById("startButton").addEventListener("click", () => {
        this.debug("Start button clicked");
        this.startGame();
      });
      document.getElementById("restartButton").addEventListener("click", () => {
        this.debug("Restart button clicked");
        this.startGame();
      });

      // Powerup buttons
      document.getElementById("freezePowerup").addEventListener("click", () => this.activatePowerup("freeze"));
      document.getElementById("doublePowerup").addEventListener("click", () => this.activatePowerup("double"));
      document.getElementById("magnetPowerup").addEventListener("click", () => this.activatePowerup("magnet"));

      // Add these new event listeners
      document.getElementById("viewHighScoresButton").addEventListener("click", () => {
        document.getElementById("startScreen").classList.add("hidden");
        document.getElementById("highScoresScreen").classList.remove("hidden");
        this.displayHighScores("highScoresListFull");
      });

      document.getElementById("backButton").addEventListener("click", () => {
        document.getElementById("highScoresScreen").classList.add("hidden");
        document.getElementById("startScreen").classList.remove("hidden");
      });

      document.getElementById("saveScoreButton").addEventListener("click", () => {
        const nameInput = document.getElementById("playerNameInput");
        const playerName = nameInput.value.trim();

        const rank = this.addHighScore(playerName, this.score, this.playerLevel);
        document.getElementById("newHighScoreForm").classList.add("hidden");

        this.displayHighScores("highScoresList", 5);

        // Highlight the player's score
        const scoreEntries = document.querySelectorAll("#highScoresList .high-score-entry");
        if (scoreEntries[rank - 1]) {
          scoreEntries[rank - 1].classList.add("highlight");
        }
      });

      // Initial render
      this.debug("Initial render");
      this.render();

      this.debug("Game initialized successfully");
    } catch (error) {
      this.debug(`Error during initialization: ${error.message}`);
      console.error(error);
    }
  }

  loadImages() {
    this.debug("Loading images...");
    const fruitImages = {
      apple: "assets/images/apple.png",
      banana: "assets/images/banana.png",
      orange: "assets/images/orange.png",
      watermelon: "assets/images/watermelon.png",
      pineapple: "assets/images/pineapple.png",
      strawberry: "assets/images/strawberry.png",
      bomb: "assets/images/bomb.png",
      star: "assets/images/star.png", // Not used for powerups explicitly now
      freeze: "assets/images/snow.png",
      double: "assets/images/two.png",
      magnet: "assets/images/magnet.png", // Ensure this path is correct if you have the image
      background: "assets/images/background.jpg" // Assuming you have a background image for fallback
    };

    const loadPromises = Object.entries(fruitImages).map(([name, src]) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Add this to avoid CORS issues
        img.onload = () => {
          this.debug(`Loaded image: ${name}`);
          this.images[name] = img;
          resolve();
        };
        img.onerror = (e) => {
          this.debug(`Failed to load image: ${name} from ${src}`);
          // Create a fallback colored rectangle
          const canvas = document.createElement("canvas");
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext("2d");

          // Different colors for different fruit types
          let color;
          switch (name) {
            case "apple":
              color = "#ff0000";
              break;
            case "banana":
              color = "#ffff00";
              break;
            case "orange":
              color = "#ffa500";
              break;
            case "watermelon":
              color = "#ff6666";
              break;
            case "pineapple":
              color = "#ffcc00";
              break;
            case "strawberry":
              color = "#ff3366";
              break;
            case "bomb":
              color = "#333333";
              break;
            case "star":
              color = "#ffcc00";
              break;
            case "freeze":
              color = "#00aaff";
              break;
            case "double":
              color = "#ffcc00";
              break;
            case "magnet":
              color = "#ff3366";
              break;
            case "background": // Fallback for background
              color = "#222222";
              break;
            default:
              color = "#ffffff";
          }

          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 200, 200);

          // Add text label
          ctx.fillStyle = "#ffffff";
          ctx.font = "24px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(name, 100, 100);

          this.images[name] = canvas;
          resolve();
        };
        img.src = src;
      });
    });

    return Promise.all(loadPromises);
  }

  loadSounds() {
    const soundFiles = {
      apple: "sound/apple.MP3",
      banana: "sound/cut_banana.MP3", // CONFIRM if you have this file
      orange: "sound/orange.MP3",
      watermelon: "sound/watermelon .MP3", // Matches filename exactly
      pineapple: "sound/pineapple.MP3",
      strawberry: "sound/cut_strawberry.MP3",
      bomb: "sound/boom.MP3",
      combo: "sound/combo.MP3",
      achievement: "sound/achievenment .MP3", // Matches filename exactly
      powerup: "sound/power-up.MP3",
      // star: "sound/golden-star.MP3", // Not used for powerups explicitly now
      double: "sound/golden-number.MP3",
      freeze: "sound/snow.MP3",
      magnet: "sound/power-up.MP3", // Using generic power-up sound for magnet
      background: "sound/menu_theme.MP3",
      slice: "sound/slice.MP3" // Re-added slice sound path
    };

    const loadPromises = Object.entries(soundFiles).map(([name, src]) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.src = src;
        audio.oncanplaythrough = () => {
          this.sounds[name] = audio;
          resolve();
        };
        audio.onerror = () => {
          // Create a fallback audio context if loading fails
          this.sounds[name] = {
            play: () => {},
            pause: () => {},
            currentTime: 0,
            volume: 1,
            loop: false,
          };
          console.warn(`[Sound Load Error] Could not load ${name} from ${src}. Using fallback.`);
          resolve();
        };
      });
    });

    return Promise.all(loadPromises);
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.debug(`Canvas resized to ${this.canvas.width}x${this.canvas.height}`);

    // Recreate background particles when canvas is resized
    this.backgroundParticles = [];
    this.createBackgroundParticles();
  }

  createBackgroundParticles() {
    for (let i = 0; i < 50; i++) {
      this.backgroundParticles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
  }

  updateBackgroundParticles() {
    this.backgroundParticles.forEach((particle) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      // Wrap around edges
      if (particle.x < 0) particle.x = this.canvas.width;
      if (particle.x > this.canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.canvas.height;
      if (particle.y > this.canvas.height) particle.y = 0;
    });
  }

  drawBackgroundParticles() {
    this.backgroundParticles.forEach((particle) => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
      this.ctx.fill();
    });
  }

  startGame() {
    this.debug("Starting game...");

    // Play background music
    if (this.sounds.background) {
      this.sounds.background.loop = true;
      this.sounds.background.volume = 0.3;
      this.sounds.background.play().catch(() => {
        // Handle autoplay restrictions
        this.debug("Background music couldn't autoplay");
      });
    }

    this.score = 0;
    this.lives = 3;
    this.combo = 1;
    this.comboTimer = 0;
    this.fruits = [];
    this.slices = [];
    this.particles = [];
    this.powerups = [];
    this.gameActive = true;
    this.lastSpawnTime = 0;
    this.fruitSliced = 0;
    // this.criticalHits = 0; // Removed
    this.updateUI();
    this.updateLivesDisplay();

    // Reset powerups
    this.activePowerups = {
      freeze: false,
      double: false,
      magnet: false,
    };
    this.powerupTimers = {
      freeze: 0,
      double: 0,
      magnet: 0,
    };


    document.querySelectorAll(".powerup").forEach((el) => {
      el.classList.remove("active");
    });

    // Hide screens
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameOverScreen").classList.add("hidden");
    document.getElementById("highScoresScreen").classList.add("hidden");

    // Make sure canvas is visible
    this.canvas.style.display = "block";


    // Force a resize to ensure canvas dimensions are correct
    this.resizeCanvas();

    // Spawn initial fruits to make something visible immediately
    this.debug("Spawning initial fruits");
    for (let i = 0; i < 3; i++) {
      this.spawnFruit();
    }

    // Start game loop
    this.debug("Starting game loop");
    this.lastFrameTime = performance.now();
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  gameLoop(currentTime) {
    if (!this.gameActive) {
      this.debug("Game not active, stopping game loop");
      return;
    }

    requestAnimationFrame((time) => this.gameLoop(time));

    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Update combo timer
    if (this.combo > 1) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.updateUI();
      }
      // Update combo meter
      const comboPercentage = (this.comboTimer / this.maxComboTimer) * 100;
      document.getElementById("comboFill").style.width = `${comboPercentage}%`;
    }

    // Update powerup timers
    for (const [powerup, active] of Object.entries(this.activePowerups)) {
      if (active) {
        this.powerupTimers[powerup] -= deltaTime;
        if (this.powerupTimers[powerup] <= 0) {
          this.activePowerups[powerup] = false;
          document.getElementById(`${powerup}Powerup`).classList.remove("active");
          this.showNotification(`${powerup.charAt(0).toUpperCase() + powerup.slice(1)} powerup expired!`);
        }
      }
    }

    // Spawn new fruits
    if (currentTime - this.lastSpawnTime > (this.activePowerups.freeze ? this.spawnInterval * 2 : this.spawnInterval)) {
      this.spawnFruit();
      // Occasionally spawn powerups
      if (Math.random() < 0.1) {
        this.spawnPowerup();
      }
      this.lastSpawnTime = currentTime;
    }

    // Update game state
    this.update(deltaTime);
    this.updateBackgroundParticles();

    // Render frame
    this.render();
  }

  spawnFruit() {
    const fruitTypes = ["apple", "banana", "orange", "watermelon", "pineapple", "strawberry"];
    // Occasionally spawn a bomb
    const type = Math.random() < 0.15 ? "bomb" : fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    const x = Math.random() * (this.canvas.width - 100) + 50;
    const fruit = {
      type,
      x,
      y: this.canvas.height + 50,
      velocity: {
        x: (Math.random() - 0.5) * 4, // More horizontal movement
        y: -12 - Math.random() * 5, // Faster upward movement
      },
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      scale: 1.2,
      // Add wobble effect
      wobble: {
        amplitude: Math.random() * 0.5 + 0.5,
        frequency: Math.random() * 0.02 + 0.01,
        offset: Math.random() * Math.PI * 2,
      },
      // Removed critical hit zone logic
    };
    this.fruits.push(fruit);
  }

  spawnPowerup() {
    const powerupTypes = ["freeze", "double", "magnet"];
    const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    const x = Math.random() * (this.canvas.width - 100) + 50;
    const powerup = {
      type,
      x,
      y: this.canvas.height + 50,
      velocity: {
        x: (Math.random() - 0.5) * 2,
        y: -10 - Math.random() * 3,
      },
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      scale: 1,
      glow: 0,
    };
    this.powerups.push(powerup);
  }

  activatePowerup(type) {
    if (this.activePowerups[type]) return; // Already active

    // Activate the powerup
    this.activePowerups[type] = true;
    this.powerupTimers[type] = this.powerupDuration;
    document.getElementById(`${type}Powerup`).classList.add("active");

    // Show notification
    let message = "";
    switch (type) {
      case "freeze":
        message = "Time Freeze activated! Fruits move slower!";
        break;
      case "double":
        message = "Double Points activated! Score twice as much!";
        break;
      case "magnet":
        message = "Fruit Magnet activated! Fruits are attracted to your slices!";
        break;
    }
    this.showNotification(message);

    // Play powerup sound
    if (this.sounds.powerup) {
      this.sounds.powerup.currentTime = 0;
      this.sounds.powerup.play().catch(() => {});
    }
  }

  showNotification(message) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.classList.add("show");

    // Hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
    }, 3000);
  }

  update(deltaTime) {
    // Update fruits
    this.fruits = this.fruits.filter((fruit) => {
      // Apply time freeze effect
      const timeScale = this.activePowerups.freeze ? 0.5 : 1;

      fruit.x += fruit.velocity.x * timeScale;
      fruit.y += fruit.velocity.y * timeScale;
      fruit.velocity.y += 0.3 * timeScale; // Gravity
      fruit.rotation += fruit.rotationSpeed * timeScale;

      // Apply wobble effect
      fruit.x += Math.sin(performance.now() * fruit.wobble.frequency + fruit.wobble.offset) * fruit.wobble.amplitude;

      // Apply magnet effect
      if (this.activePowerups.magnet && this.slicePoints.length > 0 && fruit.type !== "bomb") {
        const lastPoint = this.slicePoints[this.slicePoints.length - 1];
        const dx = lastPoint.x - fruit.x;
        const dy = lastPoint.y - fruit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 200) {
          fruit.velocity.x += (dx / distance) * 0.5;
          fruit.velocity.y += (dy / distance) * 0.5;
        }
      }

      // Remove if out of bounds
      return fruit.y < this.canvas.height + 100;
    });

    // Update powerups
    this.powerups = this.powerups.filter((powerup) => {
      powerup.x += powerup.velocity.x;
      powerup.y += powerup.velocity.y;
      powerup.velocity.y += 0.2; // Less gravity for powerups
      powerup.rotation += powerup.rotationSpeed;

      // Pulsating glow effect
      powerup.glow = (Math.sin(performance.now() * 0.005) + 1) * 0.5;

      // Remove if out of bounds
      return powerup.y < this.canvas.height + 100;
    });

    // Update slices
    this.slices = this.slices.filter((slice) => {
      slice.life -= deltaTime;
      return slice.life > 0;
    });

    // Update particles
    this.particles = this.particles.filter((particle) => {
      particle.x += particle.velocity.x;
      particle.y += particle.velocity.y;
      particle.velocity.y += 0.1; // Gravity for particles
      particle.life -= deltaTime;
      particle.rotation += particle.rotationSpeed;
      return particle.life > 0;
    });
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background particles
    this.drawBackgroundParticles();
    // Assuming you have a background image defined and loaded in this.images.background
    // if (this.images.background) {
    //   this.ctx.drawImage(this.images.background, 0, 0, this.canvas.width, this.canvas.height);
    // }

    // Draw particles
    this.particles.forEach((particle) => {
      this.ctx.save();
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate(particle.rotation);
      this.ctx.globalAlpha = particle.life / particle.initialLife;

      if (particle.type === "juice") {
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (particle.type === "slice") {
        this.ctx.fillStyle = particle.color;
        this.ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      }

      this.ctx.restore();
    });

    // Draw fruits
    this.fruits.forEach((fruit) => {
      const img = this.images[fruit.type];
      if (img) {
        this.ctx.save();
        this.ctx.translate(fruit.x, fruit.y);
        this.ctx.rotate(fruit.rotation);

        // Calculate dimensions while maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        const width = 80 * fruit.scale;
        const height = width / aspectRatio;

        this.ctx.drawImage(img, -width / 2, -height / 2, width, height);
        this.ctx.restore();
      }
    });

    // Draw powerups with glow effect
    this.powerups.forEach((powerup) => {
      const img = this.images[powerup.type];
      if (img) {
        this.ctx.save();
        this.ctx.translate(powerup.x, powerup.y);
        this.ctx.rotate(powerup.rotation);

        // Draw glow
        this.ctx.shadowColor =
          powerup.type === "freeze" ?
          "rgba(0, 150, 255, 0.8)" :
          powerup.type === "double" ?
          "rgba(255, 215, 0, 0.8)" :
          "rgba(255, 0, 0, 0.8)"; // Using red for magnet glow
        this.ctx.shadowBlur = 15 + powerup.glow * 10;

        // Calculate dimensions
        const width = 60;
        const height = 60;

        this.ctx.drawImage(img, -width / 2, -height / 2, width, height);
        this.ctx.restore();
      }
    });

    // Draw slices with improved visual effect
    this.slices.forEach((slice) => {
      // Draw slice trail
      this.ctx.beginPath();
      this.ctx.moveTo(slice.start.x, slice.start.y);

      // Create a gradient for the slice
      const gradient = this.ctx.createLinearGradient(slice.start.x, slice.start.y, slice.end.x, slice.end.y);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${slice.life / 500})`);
      gradient.addColorStop(0.5, `rgba(255, 150, 0, ${slice.life / 500})`);
      gradient.addColorStop(1, `rgba(255, 0, 150, ${slice.life / 500})`);

      this.ctx.lineTo(slice.end.x, slice.end.y);
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 8; // Thicker line for better visibility
      this.ctx.lineCap = "round"; // Rounded line ends
      this.ctx.stroke();

      // Add glow effect
      this.ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
      this.ctx.shadowBlur = 15;
      this.ctx.stroke(); // Draw again with shadow
      this.ctx.shadowBlur = 0; // Reset shadow
    });

    // Draw current slice path
    if (this.slicePoints.length > 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.slicePoints[0].x, this.slicePoints[0].y);

      // Create a gradient for the active slice
      const gradient = this.ctx.createLinearGradient(
        this.slicePoints[0].x,
        this.slicePoints[0].y,
        this.slicePoints[this.slicePoints.length - 1].x,
        this.slicePoints[this.slicePoints.length - 1].y,
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(0.5, "rgba(255, 150, 0, 0.8)");
      gradient.addColorStop(1, "rgba(255, 0, 150, 0.8)");

      for (let i = 1; i < this.slicePoints.length; i++) {
        this.ctx.lineTo(this.slicePoints[i].x, this.slicePoints[i].y);
      }
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 8;
      this.ctx.lineCap = "round";
      this.ctx.stroke();

      // Add glow effect
      this.ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
      this.ctx.shadowBlur = 15;
      this.ctx.stroke(); // Draw again with shadow
      this.ctx.shadowBlur = 0; // Reset shadow
    }
  }

  handleMouseDown(e) {
    if (!this.gameActive) return;
    const rect = this.canvas.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    this.slicePoints = [pos];
    this.lastMousePos = pos;
  }

  handleMouseMove(e) {
    if (!this.gameActive || !this.lastMousePos) return;
    const rect = this.canvas.getBoundingClientRect();
    const currentPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // Add point to slice path
    this.slicePoints.push(currentPos);

    // Check for hits along the slice path
    this.checkSlice(this.lastMousePos, currentPos);
    this.lastMousePos = currentPos;
  }

  handleMouseUp() {
    this.lastMousePos = null;
    this.slicePoints = [];
  }

  handleTouchStart(e) {
    if (!this.gameActive) return;
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const pos = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
    this.slicePoints = [pos];
    this.lastMousePos = pos;
  }

  handleTouchMove(e) {
    if (!this.gameActive || !this.lastMousePos) return;
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const currentPos = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };

    // Add point to slice path
    this.slicePoints.push(currentPos);

    // Check for hits along the slice path
    this.checkSlice(this.lastMousePos, currentPos);
    this.lastMousePos = currentPos;
  }

  handleTouchEnd() {
    this.lastMousePos = null;
    this.slicePoints = [];
  }

  checkSlice(start, end) {
    // Add slice effect
    this.slices.push({
      start,
      end,
      life: 500,
    });

    // Check for fruit hits
    this.fruits = this.fruits.filter((fruit) => {
      // ---> NEW DEBUG LINE HERE <---
      this.debug(`[Slice Check] Processing fruit object with type: ${fruit.type}`);
      // -----------------------------
      // Check if any point in the slice path intersects with the fruit
      for (let i = 1; i < this.slicePoints.length; i++) {
        const hit = this.lineIntersectsCircle(this.slicePoints[i - 1], this.slicePoints[i], fruit);
        if (hit) {
          // Declare 'points' here so it's accessible throughout the hit block
          let points = 0;

          if (fruit.type === "bomb") {
            // Hit a bomb
            this.lives--;
            this.updateLivesDisplay();
            this.createExplosion(fruit.x, fruit.y);

            // Play bomb sound
            if (this.sounds.bomb) {
              this.sounds.bomb.currentTime = 0;
              // FIX: Ensure play returns a promise or is handled safely
              Promise.resolve(this.sounds.bomb.play()).catch(() => {});
            }

            // Reset combo immediately for bombs
            this.combo = 1;
            this.comboTimer = 0;
            document.getElementById("comboFill").style.width = "0%";

            // IMMEDIATE GAME OVER AS PER USER'S LATEST REQUEST
            this.gameOver(); // THIS WAS MISSING IN YOUR UPLOADED CODE!

            return false; // Remove the bomb from the fruits array
          } else {
            // --- DEBUGGING ADDITION: This line will tell us if a fruit hit is detected! ---
            console.log("Fruit hit detected!");
            // --- END DEBUGGING ADDITION ---

            // Hit a regular fruit
            this.fruitSliced++;
            points = 10; // Base points for a fruit
            this.createScorePopup(fruit.x, fruit.y, `+${points}`);

            // Apply double points powerup only for regular fruits
            if (this.activePowerups.double) {
              points *= 2;
            }

            // Apply combo multiplier only for regular fruits
            points *= this.combo;

            this.score += points;
            this.currentXp += points;

            // Increase combo only for regular fruits
            this.combo++;
            this.comboTimer = this.maxComboTimer;

            // Play slice sound (general slice sound)
            if (this.sounds.slice) {
              this.sounds.slice.currentTime = 0;
              // FIX: Ensure play returns a promise or is handled safely
              Promise.resolve(this.sounds.slice.play()).catch(() => {});
            }

            // Play combo sound if combo is high enough
            if (this.combo >= 3 && this.sounds.combo) {
              this.sounds.combo.currentTime = 0;
              // FIX: Ensure play returns a promise or is handled safely
              Promise.resolve(this.sounds.combo.play()).catch(() => {});
            }

            // Create fruit slice particles
            this.createFruitParticles(fruit);

            // Check for achievements
            this.checkAchievements();

            // Check for level up
            if (this.currentXp >= this.xpToNextLevel) {
              this.levelUp();
            }

            this.updateUI();
            return false; // Remove the fruit from the fruits array
          }
        }
      }
      return true; // Keep the fruit if not hit
    });

    // Check for powerup hits
    this.powerups = this.powerups.filter((powerup) => {
      // Check if any point in the slice path intersects with the powerup
      for (let i = 1; i < this.slicePoints.length; i++) {
        const hit = this.lineIntersectsCircle(this.slicePoints[i - 1], this.slicePoints[i], powerup);
        if (hit) {
          // Activate the powerup
          this.activatePowerup(powerup.type);

          // Create particles
          this.createPowerupParticles(powerup);

          return false;
        }
      }
      return true;
    });
  }

  createFruitParticles(fruit) {
    // Determine fruit color based on type
    let color
    switch (fruit.type) {
      case "apple":
        color = "#ff0000"
        break
      case "banana":
        color = "#ffff00"
        break
      case "orange":
        color = "#ffa500"
        break
      case "watermelon":
        color = "#066416FF"
        break
      case "pineapple":
        color = "#ffcc00"
        break
      case "strawberry":
        color = "#ff3366"
        break
      default:
        color = "#ffffff"
    }

    // Create juice particles
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        type: "juice",
        x: fruit.x,
        y: fruit.y,
        velocity: {
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 8,
        },
        size: Math.random() * 8 + 2,
        color: color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: 1000 + Math.random() * 500,
        initialLife: 1000 + Math.random() * 500,
      })
    }

    // Create fruit slice particles
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        type: "slice",
        x: fruit.x,
        y: fruit.y,
        velocity: {
          x: (Math.random() - 0.5) * 5,
          y: (Math.random() - 0.5) * 5 - 2,
        },
        size: Math.random() * 15 + 5,
        color: color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: 1000 + Math.random() * 500,
        initialLife: 1000 + Math.random() * 500,
      })
    }
  }

  createPowerupParticles(powerup) {
    // Determine color based on powerup type
    let color
    switch (powerup.type) {
      case "freeze":
        color = "#00aaff"
        break
      case "double":
        color = "#ffcc00"
        break
      case "magnet":
        color = "#ff3366"
        break
      default:
        color = "#ffffff"
    }

    // Create particles
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        type: "juice",
        x: powerup.x,
        y: powerup.y,
        velocity: {
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 10,
        },
        size: Math.random() * 10 + 5,
        color: color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: 1500 + Math.random() * 500,
        initialLife: 1500 + Math.random() * 500,
      })
    }
  }

  createExplosion(x, y) {
    // Create explosion particles
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        type: "juice",
        x: x,
        y: y,
        velocity: {
          x: (Math.random() - 0.5) * 15,
          y: (Math.random() - 0.5) * 15,
        },
        size: Math.random() * 12 + 3,
        color: `hsl(${Math.floor(Math.random() * 30)}, 100%, 50%)`,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: 1000 + Math.random() * 500,
        initialLife: 1000 + Math.random() * 500,
      })
    }
  }

  createScorePopup(x, y, text) {
    const popup = document.createElement("div")
    popup.className = "score-popup"
    popup.textContent = text
    popup.style.left = `${x}px`
    popup.style.top = `${y}px`

    this.canvas.parentElement.appendChild(popup)

    // Remove after animation completes
    setTimeout(() => {
      popup.remove()
    }, 1000)
  }

  lineIntersectsCircle(start, end, object) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const segmentLengthSq = dx * dx + dy * dy;

    let baseRadius;
    if (object.type === 'bomb' || ['apple', 'banana', 'orange', 'watermelon', 'pineapple', 'strawberry'].includes(object.type)) {
        baseRadius = 40; // half of 80 for fruits/bombs
    } else { // For powerups
        baseRadius = 30; // half of 60 for powerups
    }

    // This is the correct line for hitRadius from the previous version
    const hitRadius = baseRadius * (object.scale || 1);
    const hitRadiusSq = hitRadius * hitRadius;

    if (segmentLengthSq === 0) {
        const distSq = (object.x - start.x) * (object.x - start.x) + (object.y - start.y) * (object.y - start.y);
        const hit = distSq < hitRadiusSq;
        this.debug(`[HitCheck] Point-in-circle for ${object.type} at (${object.x.toFixed(0)}, ${object.y.toFixed(0)}). Slice point: (${start.x.toFixed(0)}, ${start.y.toFixed(0)}). DistSq: ${distSq.toFixed(0)}, HitRadiusSq: ${hitRadiusSq.toFixed(0)}, Result: ${hit}`);
        return hit;
    }

    const dot = ((object.x - start.x) * dx + (object.y - start.y) * dy) / segmentLengthSq;

    let closestX, closestY;

    if (dot < 0) {
        closestX = start.x;
        closestY = start.y;
    } else if (dot > 1) {
        closestX = end.x;
        closestY = end.y;
    } else {
        closestX = start.x + dot * dx;
        closestY = start.y + dot * dy;
    }

    const distanceSq = (object.x - closestX) * (object.x - closestX) + (object.y - closestY) * (object.y - closestY);

    const hit = distanceSq < hitRadiusSq;
    this.debug(`[HitCheck] Line-circle for ${object.type} at (${object.x.toFixed(0)}, ${object.y.toFixed(0)}). Segment: (${start.x.toFixed(0)}, ${start.y.toFixed(0)}) to (${end.x.toFixed(0)}, ${end.y.toFixed(0)}). DistanceSq: ${distanceSq.toFixed(0)}, HitRadiusSq: ${hitRadiusSq.toFixed(0)}, Result: ${hit}`);
    return hit;
  }

  checkAchievements() {
    if (!this.achievements.slice10 && this.fruitSliced >= 10) {
      this.achievements.slice10 = true
      this.unlockAchievement("slice10")
    }

    if (!this.achievements.combo5 && this.combo >= 5) {
      this.achievements.combo5 = true
      this.unlockAchievement("combo5")
    }

    if (!this.achievements.score100 && this.score >= 100) {
      this.achievements.score100 = true
      this.unlockAchievement("score100")
    }

    // if (!this.achievements.critical && this.criticalHits >= 1) {
    //     this.achievements.critical = true;
    //     this.unlockAchievement("critical");
    // }
    // Note: The 'critical' achievement is present in the constructor,
    // but the logic to track 'criticalHits' and unlock it is not included here.
  }

  unlockAchievement(id) {
    const achievementEl = document.querySelector(`.achievement[data-id="${id}"]`)
    if (achievementEl) {
      achievementEl.classList.add("unlocked")
    }

    let message = ""
    switch (id) {
      case "slice10":
        message = "Achievement Unlocked: Slice 10 fruits!"
        break
      case "combo5":
        message = "Achievement Unlocked: 5x Combo Master!"
        break
      case "score100":
        message = "Achievement Unlocked: Score 100 points!"
        break
      // case "critical":
      //   message = "Achievement Unlocked: First Critical Hit!"
      //   break
    }
    this.showNotification(message)

    if (this.sounds.achievement) {
      this.sounds.achievement.currentTime = 0
      this.sounds.achievement.play().catch(() => {})
    }
  }

  levelUp() {
    this.currentXp -= this.xpToNextLevel
    this.playerLevel++
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5)

    this.showNotification(`Level Up! You are now level ${this.playerLevel}!`)

    this.spawnInterval = Math.max(800, this.spawnInterval - 100)
  }

  updateUI() {
    document.getElementById("score").textContent = this.score
    document.getElementById("combo").textContent = `x${this.combo}`
    const xpEl = document.getElementById("xp")
    const levelEl = document.getElementById("level")
    if (xpEl) xpEl.textContent = this.currentXp
    if (levelEl) levelEl.textContent = this.playerLevel
  }

  updateLivesDisplay() {
    const livesContainer = document.getElementById("livesContainer")
    if (!livesContainer) {
        this.debug("Error: livesContainer element not found!")
        return
    }
    const lifeElements = livesContainer.querySelectorAll(".life")

    for (let i = 0; i < lifeElements.length; i++) {
      if (i < this.lives) {
        lifeElements[i].classList.remove("lost")
      } else {
        lifeElements[i].classList.add("lost")
      }
    }
    this.debug(`Lives display updated. Current lives: ${this.lives}`)
  }

  gameOver() {
    this.debug("gameOver() called. Game Over!")

    this.gameActive = false

    if (this.sounds.background) {
      this.sounds.background.pause()
      this.sounds.background.currentTime = 0
    }

    document.getElementById("finalScore").textContent = this.score

    document.getElementById("playerLevel").textContent = this.playerLevel
    const progressPercentage = (this.currentXp / this.xpToNextLevel) * 100
    document.getElementById("levelProgress").style.width = `${progressPercentage}%`

    const isNewHighScore = this.isHighScore(this.score)
    document.getElementById("newHighScoreForm").classList.toggle("hidden", !isNewHighScore)

    if (isNewHighScore) {
      document.getElementById("playerNameInput").value = ""
      document.getElementById("playerNameInput").focus()
    }

    this.displayHighScores("highScoresList", 5)

    document.getElementById("gameOverScreen").classList.remove("hidden")
    this.debug("Game Over Screen should now be visible.")
  }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const game = new Game();
        console.log('[Game Debug] Game instance created successfully');
        await game.init();
        console.log('[Game Debug] Game initialized successfully');
    } catch (error) {
        console.error('[Game Debug] Error creating game instance or during init:', error);
        const debugElement = document.getElementById('debugInfo');
        if (debugElement) {
            const errorLine = document.createElement('div');
            errorLine.textContent = `Critical Error: ${error.message}. Check console (F12) for details.`;
            errorLine.style.color = 'red';
            debugElement.appendChild(errorLine);
        }
    }
});