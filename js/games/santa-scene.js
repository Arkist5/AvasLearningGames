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
