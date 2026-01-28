/**
 * Santa Scene - Phaser 3 Scene with all game visuals.
 * Night sky, stars, moon, parallax clouds, snow particles,
 * scrolling houses, Santa's sleigh, present drops.
 *
 * All art is drawn with Phaser Graphics API (zero external assets).
 */

var SantaScene = new Phaser.Class({

  Extends: Phaser.Scene,

  initialize: function SantaScene() {
    Phaser.Scene.call(this, { key: 'SantaScene' });

    // Game state refs (set by santa-delivery.js)
    this.gameCallbacks = {};

    // Scene objects
    this.stars = [];
    this.clouds = [];
    this.snowEmitter = null;
    this.ground = null;
    this.sleigh = null;
    this.sleighGroup = null;
    this.currentHouse = null;
    this.present = null;
    this.houses = [];
    this.houseIndex = 0;

    // Animation state
    this.sleighBobTime = 0;
    this.houseScrolling = false;
    this.presentDropping = false;
    this.timerBar = null;
    this.timerBarBg = null;
    this.easterEggActive = false;
  },

  create: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    // Night sky gradient background
    this.drawSkyGradient(w, h);

    // Moon
    this.drawMoon(w, h);

    // Stars (twinkling)
    this.createStars(w, h);

    // Parallax clouds
    this.createClouds(w, h);

    // Ground / snow line
    this.drawGround(w, h);

    // Snow particles
    this.createSnowParticles(w, h);

    // Timer bar (at top of scene)
    this.createTimerBar(w);

    // Santa's sleigh (top area)
    this.createSleigh(w, h);

    // Start random Easter egg events
    this.startEasterEggs();

    // Notify SantaDelivery that scene is ready (passes this scene ref)
    if (typeof SantaDelivery !== 'undefined' && SantaDelivery._pendingInit) {
      SantaDelivery._pendingInit(this);
      SantaDelivery._pendingInit = null;
    }
  },

  update: function (time, delta) {
    // Sleigh bob animation
    this.sleighBobTime += delta * 0.002;
    if (this.sleighGroup) {
      this.sleighGroup.y = this.sleighBaseY + Math.sin(this.sleighBobTime) * 4;
    }

    // Cloud parallax movement
    for (var i = 0; i < this.clouds.length; i++) {
      var cloud = this.clouds[i];
      cloud.x += cloud.getData('speed') * (delta / 1000);
      if (cloud.x > this.scale.width + 100) {
        cloud.x = -100;
      }
    }

    // Star twinkle
    for (var j = 0; j < this.stars.length; j++) {
      var star = this.stars[j];
      var twinkle = star.getData('twinkleSpeed');
      star.alpha = 0.4 + Math.sin(time * twinkle) * 0.4;
    }
  },

  // --- Sky & Background ---

  drawSkyGradient: function (w, h) {
    var gfx = this.add.graphics();
    // Dark navy at top -> deep blue at bottom
    var steps = 20;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      var r = Math.round(10 + t * 15);
      var g = Math.round(10 + t * 25);
      var b = Math.round(40 + t * 40);
      var color = (r << 16) | (g << 8) | b;
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, (h * i) / steps, w, h / steps + 1);
    }
  },

  drawMoon: function (w, h) {
    var gfx = this.add.graphics();
    var moonX = w * 0.82;
    var moonY = h * 0.12;
    var radius = Math.min(w, h) * 0.06;

    // Moon glow
    gfx.fillStyle(0xfff9c4, 0.15);
    gfx.fillCircle(moonX, moonY, radius * 2.5);
    gfx.fillStyle(0xfff9c4, 0.25);
    gfx.fillCircle(moonX, moonY, radius * 1.6);

    // Moon body
    gfx.fillStyle(0xfff9c4, 1);
    gfx.fillCircle(moonX, moonY, radius);

    // Crater shadows
    gfx.fillStyle(0xf0e68c, 0.5);
    gfx.fillCircle(moonX - radius * 0.3, moonY - radius * 0.2, radius * 0.15);
    gfx.fillCircle(moonX + radius * 0.2, moonY + radius * 0.3, radius * 0.1);
  },

  createStars: function (w, h) {
    var gfx = this.add.graphics();
    var starCount = 40;
    for (var i = 0; i < starCount; i++) {
      var x = Math.random() * w;
      var y = Math.random() * h * 0.5; // top half only
      var size = 1 + Math.random() * 2;

      gfx.fillStyle(0xffffff, 0.6 + Math.random() * 0.4);
      gfx.fillCircle(x, y, size);

      // Store some as twinkle targets
      if (i % 3 === 0) {
        var starObj = this.add.circle(x, y, size, 0xffffff);
        starObj.setData('twinkleSpeed', 0.001 + Math.random() * 0.003);
        this.stars.push(starObj);
      }
    }
  },

  createClouds: function (w, h) {
    for (var i = 0; i < 4; i++) {
      var cloudGfx = this.add.graphics();
      var cx = Math.random() * w;
      var cy = h * 0.1 + Math.random() * h * 0.25;
      var scale = 0.5 + Math.random() * 0.5;
      var alpha = 0.08 + Math.random() * 0.1;

      cloudGfx.fillStyle(0xffffff, alpha);
      // Cloud shape: overlapping ellipses
      cloudGfx.fillEllipse(0, 0, 80 * scale, 30 * scale);
      cloudGfx.fillEllipse(30 * scale, -8 * scale, 60 * scale, 25 * scale);
      cloudGfx.fillEllipse(-25 * scale, 5 * scale, 50 * scale, 20 * scale);

      cloudGfx.x = cx;
      cloudGfx.y = cy;
      cloudGfx.setData('speed', 5 + Math.random() * 10);
      this.clouds.push(cloudGfx);
    }
  },

  drawGround: function (w, h) {
    var groundY = h * 0.75;
    var gfx = this.add.graphics();

    // Snow-covered ground
    gfx.fillStyle(0xe8f0f8, 1);
    gfx.fillRect(0, groundY, w, h - groundY);

    // Snow surface line (slightly bumpy)
    gfx.fillStyle(0xffffff, 0.9);
    gfx.beginPath();
    gfx.moveTo(0, groundY);
    for (var x = 0; x <= w; x += 20) {
      gfx.lineTo(x, groundY - 2 + Math.sin(x * 0.05) * 3);
    }
    gfx.lineTo(w, groundY + 10);
    gfx.lineTo(0, groundY + 10);
    gfx.closePath();
    gfx.fillPath();

    this.groundY = groundY;
  },

  createSnowParticles: function (w, h) {
    // Create a small white circle texture for snow
    var snowGfx = this.make.graphics({ x: 0, y: 0, add: false });
    snowGfx.fillStyle(0xffffff, 1);
    snowGfx.fillCircle(4, 4, 4);
    snowGfx.generateTexture('snowflake', 8, 8);
    snowGfx.destroy();

    this.snowEmitter = this.add.particles(0, -10, 'snowflake', {
      x: { min: 0, max: w },
      lifespan: { min: 4000, max: 8000 },
      speedY: { min: 20, max: 50 },
      speedX: { min: -15, max: 15 },
      scale: { min: 0.2, max: 0.6 },
      alpha: { start: 0.8, end: 0.2 },
      frequency: 100,
      quantity: 1,
    });
  },

  // --- Timer Bar ---

  createTimerBar: function (w) {
    this.timerBarBg = this.add.graphics();
    this.timerBarBg.fillStyle(0x000000, 0.3);
    this.timerBarBg.fillRoundedRect(w * 0.1, 8, w * 0.8, 8, 4);

    this.timerBar = this.add.graphics();
    this.timerBar.setDepth(100);
    this.timerBarBg.setDepth(99);
    this.updateTimerBar(1.0);
  },

  updateTimerBar: function (ratio) {
    if (!this.timerBar) return;
    this.timerBar.clear();

    var w = this.scale.width;
    var barW = w * 0.8 * Math.max(0, ratio);

    // Color: green -> yellow -> red
    var color;
    if (ratio > 0.5) {
      color = 0x00b894;
    } else if (ratio > 0.2) {
      color = 0xfdcb6e;
    } else {
      color = 0xe74c3c;
    }

    this.timerBar.fillStyle(color, 1);
    this.timerBar.fillRoundedRect(w * 0.1, 8, barW, 8, 4);
  },

  // --- Sleigh ---

  createSleigh: function (w, h) {
    this.sleighBaseY = h * 0.15;
    this.sleighGroup = this.add.container(w * 0.5, this.sleighBaseY);
    this.sleighGroup.setDepth(50);

    var gfx = this.add.graphics();

    // Sleigh body (red)
    gfx.fillStyle(0xc0392b, 1);
    gfx.fillRoundedRect(-30, -5, 60, 25, 6);

    // Sleigh front curve
    gfx.fillStyle(0xc0392b, 1);
    gfx.beginPath();
    gfx.moveTo(30, -5);
    gfx.lineTo(40, -15);
    gfx.lineTo(40, 5);
    gfx.lineTo(30, 20);
    gfx.closePath();
    gfx.fillPath();

    // Runner (brown)
    gfx.fillStyle(0x8b4513, 1);
    gfx.fillRoundedRect(-35, 22, 75, 5, 3);

    // Runner curve front
    gfx.beginPath();
    gfx.moveTo(40, 22);
    gfx.lineTo(48, 15);
    gfx.lineTo(48, 20);
    gfx.lineTo(40, 27);
    gfx.closePath();
    gfx.fillPath();

    // Santa (simplified)
    // Body
    gfx.fillStyle(0xe74c3c, 1);
    gfx.fillCircle(0, -15, 12);
    // Head
    gfx.fillStyle(0xfdd9b5, 1);
    gfx.fillCircle(0, -28, 8);
    // Hat
    gfx.fillStyle(0xe74c3c, 1);
    gfx.beginPath();
    gfx.moveTo(-8, -32);
    gfx.lineTo(0, -45);
    gfx.lineTo(8, -32);
    gfx.closePath();
    gfx.fillPath();
    // Hat pompom
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(0, -45, 3);
    // Belt
    gfx.fillStyle(0x2d3436, 1);
    gfx.fillRect(-12, -10, 24, 4);
    gfx.fillStyle(0xf1c40f, 1);
    gfx.fillRect(-4, -11, 8, 6);

    this.sleighGroup.add(gfx);
  },

  // --- Houses ---

  showHouse: function (houseData) {
    var w = this.scale.width;
    var groundY = this.groundY;

    // Remove old house
    if (this.currentHouse) {
      this.currentHouse.destroy();
    }

    var houseGroup = this.add.container(w + 60, groundY);
    houseGroup.setDepth(30);

    var gfx = this.add.graphics();

    // House colors - cycle through festive palette
    var wallColors = [0x5dade2, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c];
    var roofColors = [0x2c3e50, 0x8b0000, 0x1a5e3a, 0xd35400, 0x6c3483, 0x117a65];
    var colorIdx = (this.houseIndex) % wallColors.length;
    var wallColor = wallColors[colorIdx];
    var roofColor = roofColors[colorIdx];

    var houseW = 70;
    var houseH = 55;

    // Wall
    gfx.fillStyle(wallColor, 1);
    gfx.fillRect(-houseW / 2, -houseH, houseW, houseH);

    // Roof (triangle)
    gfx.fillStyle(roofColor, 1);
    gfx.beginPath();
    gfx.moveTo(-houseW / 2 - 8, -houseH);
    gfx.lineTo(0, -houseH - 30);
    gfx.lineTo(houseW / 2 + 8, -houseH);
    gfx.closePath();
    gfx.fillPath();

    // Snow on roof
    gfx.fillStyle(0xffffff, 0.9);
    gfx.beginPath();
    gfx.moveTo(-houseW / 2 - 8, -houseH);
    gfx.lineTo(-5, -houseH - 27);
    gfx.lineTo(5, -houseH - 27);
    gfx.lineTo(houseW / 2 + 8, -houseH);
    gfx.lineTo(houseW / 2 + 10, -houseH + 4);
    gfx.lineTo(-houseW / 2 - 10, -houseH + 4);
    gfx.closePath();
    gfx.fillPath();

    // Chimney
    gfx.fillStyle(0x8b4513, 1);
    gfx.fillRect(houseW / 2 - 18, -houseH - 25, 14, 22);
    // Chimney top
    gfx.fillStyle(0x6d3a1a, 1);
    gfx.fillRect(houseW / 2 - 20, -houseH - 27, 18, 5);

    // Windows (dark initially, light up on correct)
    this.windowRects = [];
    var winPositions = [
      { x: -18, y: -houseH + 12, w: 14, h: 14 },
      { x: 8, y: -houseH + 12, w: 14, h: 14 },
    ];
    for (var i = 0; i < winPositions.length; i++) {
      var wp = winPositions[i];
      gfx.fillStyle(0x2c3e50, 0.6);
      gfx.fillRect(wp.x, wp.y, wp.w, wp.h);
      this.windowRects.push(wp);
    }

    // Door
    gfx.fillStyle(0x8b4513, 1);
    gfx.fillRoundedRect(-7, -22, 14, 22, { tl: 7, tr: 7, bl: 0, br: 0 });
    // Doorknob
    gfx.fillStyle(0xf1c40f, 1);
    gfx.fillCircle(4, -10, 2);

    houseGroup.add(gfx);
    this.currentHouse = houseGroup;
    this.houseGfx = gfx;
    this.houseIndex++;

    // Scroll house into position
    var targetX = w * 0.5;
    this.tweens.add({
      targets: houseGroup,
      x: targetX,
      duration: 800,
      ease: 'Power2',
      onComplete: function () {
        if (this.gameCallbacks.onHouseReady) {
          this.gameCallbacks.onHouseReady();
        }
      }.bind(this),
    });
  },

  // --- Present Drop ---

  dropPresent: function (correct, onComplete) {
    var w = this.scale.width;
    var targetX = w * 0.5;
    var startY = this.sleighBaseY + 20;

    // Create present
    var presentGfx = this.add.graphics();
    presentGfx.setDepth(45);

    // Present box
    var boxColor = correct ? 0xe74c3c : 0x95a5a6;
    presentGfx.fillStyle(boxColor, 1);
    presentGfx.fillRect(-10, -10, 20, 20);
    // Ribbon horizontal
    presentGfx.fillStyle(0xf1c40f, 1);
    presentGfx.fillRect(-10, -2, 20, 4);
    // Ribbon vertical
    presentGfx.fillRect(-2, -10, 4, 20);
    // Bow
    presentGfx.fillStyle(0xf1c40f, 1);
    presentGfx.fillCircle(-3, -12, 4);
    presentGfx.fillCircle(3, -12, 4);

    presentGfx.x = targetX;
    presentGfx.y = startY;

    if (correct) {
      // Arc into chimney
      var chimneyX = targetX + 17;
      var chimneyY = this.groundY - 80;

      this.tweens.add({
        targets: presentGfx,
        x: chimneyX,
        y: chimneyY,
        duration: 600,
        ease: 'Quad.easeIn',
        onComplete: function () {
          // Present disappears into chimney
          presentGfx.destroy();

          // Particle burst at chimney
          this.chimneyBurst(chimneyX, chimneyY);

          // Light up windows
          this.lightUpHouse();

          if (onComplete) onComplete();
        }.bind(this),
      });
    } else {
      // Present misses - drops to ground
      var missX = targetX + (Math.random() > 0.5 ? 50 : -50);
      this.tweens.add({
        targets: presentGfx,
        x: missX,
        y: this.groundY - 5,
        angle: 180,
        duration: 800,
        ease: 'Bounce.easeOut',
        onComplete: function () {
          // Fade out
          this.tweens.add({
            targets: presentGfx,
            alpha: 0,
            duration: 500,
            onComplete: function () {
              presentGfx.destroy();
              if (onComplete) onComplete();
            },
          });
        }.bind(this),
      });
    }
  },

  chimneyBurst: function (x, y) {
    // Quick particle burst
    var burstGfx = this.make.graphics({ x: 0, y: 0, add: false });
    burstGfx.fillStyle(0xf1c40f, 1);
    burstGfx.fillCircle(4, 4, 4);
    burstGfx.generateTexture('burst', 8, 8);
    burstGfx.destroy();

    var emitter = this.add.particles(x, y, 'burst', {
      speed: { min: 30, max: 80 },
      angle: { min: 200, max: 340 },
      lifespan: 600,
      scale: { start: 0.8, end: 0 },
      quantity: 8,
      tint: [0xf1c40f, 0xe74c3c, 0x2ecc71, 0xffffff],
      emitting: false,
    });
    emitter.setDepth(60);
    emitter.explode();

    this.time.delayedCall(1000, function () {
      emitter.destroy();
    });
  },

  lightUpHouse: function () {
    if (!this.houseGfx || !this.windowRects) return;

    // Draw lit windows over the dark ones
    for (var i = 0; i < this.windowRects.length; i++) {
      var wp = this.windowRects[i];
      this.houseGfx.fillStyle(0xfff9c4, 0.9);
      this.houseGfx.fillRect(wp.x, wp.y, wp.w, wp.h);
    }
  },

  // --- House Transition ---

  scrollHouseOut: function (onComplete) {
    if (!this.currentHouse) {
      if (onComplete) onComplete();
      return;
    }

    this.tweens.add({
      targets: this.currentHouse,
      x: -100,
      duration: 600,
      ease: 'Power2',
      onComplete: function () {
        if (this.currentHouse) {
          this.currentHouse.destroy();
          this.currentHouse = null;
        }
        if (onComplete) onComplete();
      }.bind(this),
    });
  },

  // --- Victory ---

  showVictoryFireworks: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    // Create firework particle textures
    var fwGfx = this.make.graphics({ x: 0, y: 0, add: false });
    fwGfx.fillStyle(0xffffff, 1);
    fwGfx.fillCircle(3, 3, 3);
    fwGfx.generateTexture('firework', 6, 6);
    fwGfx.destroy();

    // Launch 3-4 bursts
    var colors = [0xe74c3c, 0xf1c40f, 0x2ecc71, 0x6c5ce7, 0x00cec9];

    for (var i = 0; i < 4; i++) {
      (function (idx) {
        var delay = idx * 400;
        this.time.delayedCall(delay, function () {
          var x = w * 0.2 + Math.random() * w * 0.6;
          var y = h * 0.15 + Math.random() * h * 0.3;
          var color = colors[idx % colors.length];

          var emitter = this.add.particles(x, y, 'firework', {
            speed: { min: 40, max: 120 },
            angle: { min: 0, max: 360 },
            lifespan: 800,
            scale: { start: 0.8, end: 0 },
            quantity: 20,
            tint: color,
            emitting: false,
          });
          emitter.setDepth(80);
          emitter.explode();

          this.time.delayedCall(1200, function () {
            emitter.destroy();
          });
        }.bind(this));
      }.bind(this))(i);
    }

    // Santa flies up
    if (this.sleighGroup) {
      this.tweens.add({
        targets: this.sleighGroup,
        y: -80,
        x: w + 100,
        duration: 2000,
        ease: 'Power2',
        delay: 1000,
      });
    }
  },

  // ─── EASTER EGGS ─────────────────────────────────────────────
  // Random events that spawn during gameplay to surprise and delight.
  // Rarity: common (40%), uncommon (15% each), rare (5% each)

  startEasterEggs: function () {
    this.easterEggActive = false;
    this.scheduleNextEasterEgg();
  },

  scheduleNextEasterEgg: function () {
    // Random delay: 8-18 seconds between events
    var delay = 8000 + Math.random() * 10000;
    this.time.delayedCall(delay, function () {
      if (!this.scene.isActive()) return;
      this.spawnRandomEvent();
      this.scheduleNextEasterEgg();
    }.bind(this));
  },

  spawnRandomEvent: function () {
    if (this.easterEggActive) return;
    this.easterEggActive = true;

    // Weighted random pick
    var roll = Math.random() * 100;
    if (roll < 30) {
      this.eggShootingStar();
    } else if (roll < 48) {
      this.eggRudolph();
    } else if (roll < 63) {
      this.eggPenguin();
    } else if (roll < 78) {
      this.eggSnowman();
    } else if (roll < 88) {
      this.eggUFO();
    } else if (roll < 95) {
      this.eggElfRocket();
    } else {
      this.eggNorthernLights();
    }
  },

  // --- Shooting Star (common ~30%) ---
  // A bright streak arcs across the upper sky with a sparkle trail.

  eggShootingStar: function () {
    var w = this.scale.width;
    var h = this.scale.height;
    var startX = Math.random() * w * 0.3;
    var startY = Math.random() * h * 0.15 + 10;
    var endX = startX + w * 0.5 + Math.random() * w * 0.3;
    var endY = startY + h * 0.15 + Math.random() * h * 0.1;

    var star = this.add.graphics();
    star.setDepth(40);
    star.x = startX;
    star.y = startY;

    // Bright core
    star.fillStyle(0xffffff, 1);
    star.fillCircle(0, 0, 3);
    // Glow
    star.fillStyle(0xfff9c4, 0.4);
    star.fillCircle(0, 0, 8);

    // Trail particles
    var trailGfx = this.make.graphics({ x: 0, y: 0, add: false });
    trailGfx.fillStyle(0xfff9c4, 1);
    trailGfx.fillCircle(2, 2, 2);
    trailGfx.generateTexture('startrail', 4, 4);
    trailGfx.destroy();

    var trail = this.add.particles(startX, startY, 'startrail', {
      speed: { min: 5, max: 15 },
      lifespan: 400,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      frequency: 20,
      quantity: 1,
      blendMode: 'ADD',
    });
    trail.setDepth(39);

    var scene = this;
    this.tweens.add({
      targets: star,
      x: endX,
      y: endY,
      alpha: 0,
      duration: 800 + Math.random() * 400,
      ease: 'Cubic.easeIn',
      onUpdate: function () {
        trail.setPosition(star.x, star.y);
      },
      onComplete: function () {
        star.destroy();
        trail.stop();
        scene.time.delayedCall(500, function () { trail.destroy(); });
        scene.easterEggActive = false;
      },
    });
  },

  // --- Rudolph (uncommon ~18%) ---
  // A reindeer with a glowing red nose flies across the sky.

  eggRudolph: function () {
    var w = this.scale.width;
    var h = this.scale.height;
    var y = h * 0.25 + Math.random() * h * 0.15;
    var fromLeft = Math.random() > 0.5;
    var startX = fromLeft ? -60 : w + 60;
    var endX = fromLeft ? w + 60 : -60;

    var rudolf = this.add.container(startX, y);
    rudolf.setDepth(42);
    var gfx = this.add.graphics();
    var dir = fromLeft ? 1 : -1;

    // Body (brown)
    gfx.fillStyle(0x8b6914, 1);
    gfx.fillEllipse(0, 0, 36, 18);

    // Head
    gfx.fillStyle(0x8b6914, 1);
    gfx.fillCircle(18 * dir, -6, 9);

    // Antlers
    gfx.lineStyle(2, 0x5c3d0e, 1);
    gfx.beginPath();
    gfx.moveTo(14 * dir, -14);
    gfx.lineTo(12 * dir, -26);
    gfx.lineTo(6 * dir, -24);
    gfx.moveTo(12 * dir, -26);
    gfx.lineTo(18 * dir, -28);
    gfx.strokePath();
    gfx.beginPath();
    gfx.moveTo(22 * dir, -14);
    gfx.lineTo(24 * dir, -26);
    gfx.lineTo(20 * dir, -28);
    gfx.moveTo(24 * dir, -26);
    gfx.lineTo(28 * dir, -24);
    gfx.strokePath();

    // Glowing red nose!
    gfx.fillStyle(0xff0000, 0.3);
    gfx.fillCircle(26 * dir, -5, 8);
    gfx.fillStyle(0xff0000, 1);
    gfx.fillCircle(26 * dir, -5, 4);

    // Eye
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(20 * dir, -8, 2);

    // Legs (little lines)
    gfx.lineStyle(2, 0x6b4f10, 1);
    gfx.beginPath();
    gfx.moveTo(-6, 8); gfx.lineTo(-8, 18);
    gfx.moveTo(0, 8); gfx.lineTo(-2, 18);
    gfx.moveTo(6, 8); gfx.lineTo(4, 18);
    gfx.moveTo(12, 8); gfx.lineTo(10, 18);
    gfx.strokePath();

    // Tail
    gfx.fillStyle(0x5c3d0e, 1);
    gfx.fillCircle(-18 * dir, -3, 4);

    rudolf.add(gfx);

    var scene = this;
    // Gentle bobbing while flying
    this.tweens.add({
      targets: rudolf,
      y: y - 8,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: rudolf,
      x: endX,
      duration: 4000 + Math.random() * 1500,
      ease: 'Linear',
      onComplete: function () {
        rudolf.destroy();
        scene.easterEggActive = false;
      },
    });
  },

  // --- Penguin (uncommon ~15%) ---
  // A penguin slides across the snowy ground on its belly.

  eggPenguin: function () {
    var w = this.scale.width;
    var groundY = this.groundY;
    var fromLeft = Math.random() > 0.5;
    var startX = fromLeft ? -40 : w + 40;
    var endX = fromLeft ? w + 40 : -40;

    var penguin = this.add.container(startX, groundY - 12);
    penguin.setDepth(35);
    var gfx = this.add.graphics();

    // Body (black oval)
    gfx.fillStyle(0x2d3436, 1);
    gfx.fillEllipse(0, 0, 20, 16);

    // Belly (white)
    gfx.fillStyle(0xffffff, 1);
    gfx.fillEllipse(0, 2, 12, 11);

    // Head
    gfx.fillStyle(0x2d3436, 1);
    gfx.fillCircle(0, -10, 8);

    // Eyes
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(-3, -11, 3);
    gfx.fillCircle(3, -11, 3);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(-3, -11, 1.5);
    gfx.fillCircle(3, -11, 1.5);

    // Beak (orange)
    gfx.fillStyle(0xf39c12, 1);
    gfx.beginPath();
    gfx.moveTo(-3, -8);
    gfx.lineTo(0, -5);
    gfx.lineTo(3, -8);
    gfx.closePath();
    gfx.fillPath();

    // Little feet sticking up behind (belly slide!)
    gfx.fillStyle(0xf39c12, 1);
    var backDir = fromLeft ? -1 : 1;
    gfx.fillEllipse(8 * backDir, 6, 6, 4);
    gfx.fillEllipse(12 * backDir, 4, 6, 4);

    // Scarf (red)
    gfx.fillStyle(0xe74c3c, 1);
    gfx.fillRect(-7, -5, 14, 3);
    // Scarf tail flying behind
    gfx.fillStyle(0xe74c3c, 1);
    gfx.fillRect(6 * backDir, -5, 10, 2);
    gfx.fillRect(10 * backDir, -4, 8, 2);

    penguin.add(gfx);

    // Snow spray particles behind
    var sprayGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sprayGfx.fillStyle(0xffffff, 1);
    sprayGfx.fillCircle(2, 2, 2);
    sprayGfx.generateTexture('penguinspray', 4, 4);
    sprayGfx.destroy();

    var spray = this.add.particles(startX, groundY - 2, 'penguinspray', {
      speed: { min: 10, max: 30 },
      angle: fromLeft ? { min: 130, max: 170 } : { min: 10, max: 50 },
      lifespan: 300,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      frequency: 50,
      quantity: 2,
    });
    spray.setDepth(34);

    var scene = this;
    this.tweens.add({
      targets: penguin,
      x: endX,
      duration: 3000 + Math.random() * 1000,
      ease: 'Linear',
      onUpdate: function () {
        spray.setPosition(penguin.x, groundY - 2);
      },
      onComplete: function () {
        penguin.destroy();
        spray.stop();
        scene.time.delayedCall(400, function () { spray.destroy(); });
        scene.easterEggActive = false;
      },
    });
  },

  // --- Snowman (uncommon ~15%) ---
  // A snowman pops up from behind the snow, waves, then sinks back down.

  eggSnowman: function () {
    var w = this.scale.width;
    var groundY = this.groundY;
    // Appear on left or right side to avoid the house
    var side = Math.random() > 0.5;
    var x = side ? w * 0.15 + Math.random() * w * 0.15 : w * 0.7 + Math.random() * w * 0.15;

    var snowman = this.add.container(x, groundY + 40);
    snowman.setDepth(32);
    var gfx = this.add.graphics();

    // Bottom snowball
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(0, 0, 16);
    // Middle snowball
    gfx.fillCircle(0, -20, 12);
    // Head
    gfx.fillCircle(0, -36, 9);

    // Eyes (coal)
    gfx.fillStyle(0x2d3436, 1);
    gfx.fillCircle(-3, -38, 2);
    gfx.fillCircle(3, -38, 2);

    // Carrot nose
    gfx.fillStyle(0xf39c12, 1);
    gfx.beginPath();
    gfx.moveTo(0, -35);
    gfx.lineTo(8, -34);
    gfx.lineTo(0, -33);
    gfx.closePath();
    gfx.fillPath();

    // Smile (dots)
    gfx.fillStyle(0x2d3436, 1);
    gfx.fillCircle(-4, -32, 1);
    gfx.fillCircle(-1, -30.5, 1);
    gfx.fillCircle(2, -30.5, 1);
    gfx.fillCircle(5, -32, 1);

    // Top hat
    gfx.fillStyle(0x2d3436, 1);
    gfx.fillRect(-7, -52, 14, 12);
    gfx.fillRect(-10, -42, 20, 3);

    // Buttons
    gfx.fillStyle(0x2d3436, 1);
    gfx.fillCircle(0, -24, 2);
    gfx.fillCircle(0, -18, 2);
    gfx.fillCircle(0, -12, 2);

    // Stick arms
    gfx.lineStyle(2, 0x5c3d0e, 1);
    gfx.beginPath();
    gfx.moveTo(-12, -20);
    gfx.lineTo(-28, -30);
    gfx.moveTo(-24, -28);
    gfx.lineTo(-28, -34);
    gfx.moveTo(-24, -28);
    gfx.lineTo(-30, -28);
    gfx.strokePath();

    // Right arm (will wave)
    var waveArm = this.add.graphics();
    waveArm.lineStyle(2, 0x5c3d0e, 1);
    waveArm.beginPath();
    waveArm.moveTo(0, 0);
    waveArm.lineTo(16, -10);
    waveArm.moveTo(12, -8);
    waveArm.lineTo(16, -14);
    waveArm.moveTo(12, -8);
    waveArm.lineTo(18, -8);
    waveArm.strokePath();
    waveArm.x = 12;
    waveArm.y = -20;

    snowman.add(gfx);
    snowman.add(waveArm);

    var scene = this;

    // Pop up from ground
    this.tweens.add({
      targets: snowman,
      y: groundY - 6,
      duration: 800,
      ease: 'Back.easeOut',
      onComplete: function () {
        // Wave the arm back and forth
        scene.tweens.add({
          targets: waveArm,
          angle: -25,
          duration: 300,
          yoyo: true,
          repeat: 4,
          ease: 'Sine.easeInOut',
          onComplete: function () {
            // Pause, then sink back down
            scene.time.delayedCall(400, function () {
              scene.tweens.add({
                targets: snowman,
                y: groundY + 50,
                duration: 600,
                ease: 'Back.easeIn',
                onComplete: function () {
                  snowman.destroy();
                  scene.easterEggActive = false;
                },
              });
            });
          },
        });
      },
    });
  },

  // --- UFO (rare ~10%) ---
  // A flying saucer zips across the sky with blinking colored lights.

  eggUFO: function () {
    var w = this.scale.width;
    var h = this.scale.height;
    var y = h * 0.1 + Math.random() * h * 0.2;
    var fromLeft = Math.random() > 0.5;
    var startX = fromLeft ? -50 : w + 50;
    var endX = fromLeft ? w + 50 : -50;

    var ufo = this.add.container(startX, y);
    ufo.setDepth(43);
    var gfx = this.add.graphics();

    // Saucer body (silver)
    gfx.fillStyle(0xbdc3c7, 1);
    gfx.fillEllipse(0, 0, 44, 12);

    // Dome (teal glass)
    gfx.fillStyle(0x00cec9, 0.6);
    gfx.fillEllipse(0, -6, 22, 14);
    // Dome highlight
    gfx.fillStyle(0xffffff, 0.3);
    gfx.fillEllipse(-3, -9, 10, 6);

    // Bottom ring
    gfx.fillStyle(0x95a5a6, 1);
    gfx.fillEllipse(0, 3, 36, 6);

    // Colored lights (will blink)
    var lightColors = [0xe74c3c, 0x2ecc71, 0xf1c40f, 0x6c5ce7, 0x00cec9];
    var lights = [];
    for (var i = 0; i < 5; i++) {
      var angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      var lx = Math.cos(angle) * 16;
      var ly = Math.sin(angle) * 4 + 3;
      var light = this.add.circle(lx, ly, 2.5, lightColors[i]);
      light.setData('baseColor', lightColors[i]);
      light.setData('blinkPhase', i * 0.4);
      lights.push(light);
      ufo.add(light);
    }

    ufo.add(gfx);
    // Bring lights in front of body
    for (var j = 0; j < lights.length; j++) {
      ufo.bringToTop(lights[j]);
    }

    // Beam of light (tractor beam look - fades in and out)
    var beam = this.add.graphics();
    beam.fillStyle(0x00cec9, 0.12);
    beam.beginPath();
    beam.moveTo(-10, 0);
    beam.lineTo(-30, 60);
    beam.lineTo(30, 60);
    beam.lineTo(10, 0);
    beam.closePath();
    beam.fillPath();
    ufo.add(beam);

    // Blink lights in update-like fashion
    var blinkTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: function () {
        var t = this.time.now * 0.005;
        for (var k = 0; k < lights.length; k++) {
          var phase = lights[k].getData('blinkPhase');
          lights[k].alpha = 0.3 + Math.abs(Math.sin(t + phase)) * 0.7;
        }
      }.bind(this),
    });

    var scene = this;
    // UFO wobbles and zips fast
    this.tweens.add({
      targets: ufo,
      y: y - 10,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: ufo,
      x: endX,
      duration: 2500 + Math.random() * 1000,
      ease: 'Sine.easeInOut', // eases in and out - looks like it slows to look around
      onComplete: function () {
        blinkTimer.destroy();
        ufo.destroy();
        scene.easterEggActive = false;
      },
    });
  },

  // --- Elf on a Rocket (rare ~7%) ---
  // A little elf rides a candy-cane-striped rocket across the sky, trailing sparkles.

  eggElfRocket: function () {
    var w = this.scale.width;
    var h = this.scale.height;
    var y = h * 0.2 + Math.random() * h * 0.2;
    var fromLeft = Math.random() > 0.5;
    var startX = fromLeft ? -50 : w + 50;
    var endX = fromLeft ? w + 80 : -80;
    var dir = fromLeft ? 1 : -1;

    var rocket = this.add.container(startX, y);
    rocket.setDepth(44);
    var gfx = this.add.graphics();

    // Rocket body - candy cane stripes (red and white)
    for (var s = 0; s < 5; s++) {
      gfx.fillStyle(s % 2 === 0 ? 0xe74c3c : 0xffffff, 1);
      gfx.fillRect(-20 + s * 8 * dir, -5, 8, 10);
    }
    // Rounded nose
    gfx.fillStyle(0xe74c3c, 1);
    gfx.fillCircle(20 * dir, 0, 5);
    // Fins
    gfx.fillStyle(0x2ecc71, 1);
    gfx.beginPath();
    gfx.moveTo(-20 * dir, -5);
    gfx.lineTo(-28 * dir, -12);
    gfx.lineTo(-20 * dir, 0);
    gfx.closePath();
    gfx.fillPath();
    gfx.beginPath();
    gfx.moveTo(-20 * dir, 5);
    gfx.lineTo(-28 * dir, 12);
    gfx.lineTo(-20 * dir, 0);
    gfx.closePath();
    gfx.fillPath();

    // Elf riding on top
    // Body (green)
    gfx.fillStyle(0x2ecc71, 1);
    gfx.fillCircle(5 * dir, -12, 7);
    // Head (skin tone)
    gfx.fillStyle(0xfdd9b5, 1);
    gfx.fillCircle(5 * dir, -22, 6);
    // Elf hat (green with red tip)
    gfx.fillStyle(0x2ecc71, 1);
    gfx.beginPath();
    gfx.moveTo(0 * dir, -26);
    gfx.lineTo(5 * dir, -36);
    gfx.lineTo(10 * dir, -26);
    gfx.closePath();
    gfx.fillPath();
    // Hat tip (red ball)
    gfx.fillStyle(0xe74c3c, 1);
    gfx.fillCircle(5 * dir, -36, 2.5);
    // Elf ears (pointy)
    gfx.fillStyle(0xfdd9b5, 1);
    gfx.beginPath();
    gfx.moveTo(-1 * dir, -22);
    gfx.lineTo(-5 * dir, -25);
    gfx.lineTo(-1 * dir, -20);
    gfx.closePath();
    gfx.fillPath();
    // Eyes (excited!)
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(3 * dir, -23, 1.5);
    gfx.fillCircle(7 * dir, -23, 1.5);
    // Big smile
    gfx.lineStyle(1, 0x000000, 1);
    gfx.beginPath();
    gfx.arc(5 * dir, -20, 3, 0, Math.PI);
    gfx.strokePath();

    rocket.add(gfx);

    // Sparkle trail behind
    var sparkGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sparkGfx.fillStyle(0xffffff, 1);
    sparkGfx.fillCircle(3, 3, 3);
    sparkGfx.generateTexture('elfsparkle', 6, 6);
    sparkGfx.destroy();

    var trail = this.add.particles(startX, y, 'elfsparkle', {
      speed: { min: 20, max: 50 },
      angle: fromLeft ? { min: 150, max: 210 } : { min: -30, max: 30 },
      lifespan: 500,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      frequency: 30,
      quantity: 2,
      tint: [0xf1c40f, 0xe74c3c, 0x2ecc71, 0xffffff, 0x6c5ce7],
      blendMode: 'ADD',
    });
    trail.setDepth(43);

    var scene = this;
    // Slight wave pattern as it flies
    this.tweens.add({
      targets: rocket,
      y: y - 15,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: rocket,
      x: endX,
      duration: 2800 + Math.random() * 800,
      ease: 'Linear',
      onUpdate: function () {
        trail.setPosition(rocket.x - 20 * dir, rocket.y);
      },
      onComplete: function () {
        rocket.destroy();
        trail.stop();
        scene.time.delayedCall(600, function () { trail.destroy(); });
        scene.easterEggActive = false;
      },
    });
  },

  // --- Northern Lights (very rare ~5%) ---
  // Shimmering green/purple aurora bands ripple across the top of the sky.

  eggNorthernLights: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    var aurora = this.add.container(0, 0);
    aurora.setDepth(8); // behind clouds but above stars
    aurora.alpha = 0;

    var colors = [
      { color: 0x2ecc71, y: h * 0.02, height: h * 0.08 },
      { color: 0x6c5ce7, y: h * 0.06, height: h * 0.06 },
      { color: 0x00cec9, y: h * 0.01, height: h * 0.07 },
      { color: 0x2ecc71, y: h * 0.09, height: h * 0.05 },
    ];

    var bands = [];
    for (var i = 0; i < colors.length; i++) {
      var band = this.add.graphics();
      band.fillStyle(colors[i].color, 0.12 + Math.random() * 0.06);
      // Wavy band shape
      band.beginPath();
      band.moveTo(0, colors[i].y);
      for (var bx = 0; bx <= w; bx += 15) {
        var wave = Math.sin(bx * 0.01 + i * 1.5) * 12;
        band.lineTo(bx, colors[i].y + wave);
      }
      for (var bx2 = w; bx2 >= 0; bx2 -= 15) {
        var wave2 = Math.sin(bx2 * 0.01 + i * 1.5 + 1) * 12;
        band.lineTo(bx2, colors[i].y + colors[i].height + wave2);
      }
      band.closePath();
      band.fillPath();
      aurora.add(band);
      bands.push(band);
    }

    var scene = this;

    // Fade in
    this.tweens.add({
      targets: aurora,
      alpha: 1,
      duration: 2000,
      ease: 'Sine.easeIn',
      onComplete: function () {
        // Shimmer the bands
        for (var b = 0; b < bands.length; b++) {
          scene.tweens.add({
            targets: bands[b],
            alpha: 0.3 + Math.random() * 0.5,
            duration: 800 + Math.random() * 400,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            delay: b * 200,
          });
        }

        // Fade out after shimmer
        scene.time.delayedCall(5000, function () {
          scene.tweens.add({
            targets: aurora,
            alpha: 0,
            duration: 2000,
            ease: 'Sine.easeOut',
            onComplete: function () {
              aurora.destroy();
              scene.easterEggActive = false;
            },
          });
        });
      },
    });
  },

  // ─── END EASTER EGGS ───────────────────────────────────────

  // --- Cleanup ---

  shutdown: function () {
    this.stars = [];
    this.clouds = [];
    this.windowRects = [];
    if (this.snowEmitter) {
      this.snowEmitter.destroy();
      this.snowEmitter = null;
    }
    if (this.currentHouse) {
      this.currentHouse.destroy();
      this.currentHouse = null;
    }
  },
});
