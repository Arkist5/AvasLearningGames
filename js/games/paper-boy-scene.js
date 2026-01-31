/**
 * Paper Boy Scene - Phaser 3 Scene with all game visuals.
 * Daytime street scene with parallax clouds, scrolling houses,
 * boy on bike, newspaper throws, and funny miss animations.
 *
 * All art is drawn with Phaser Graphics API (zero external assets).
 */

var PaperBoyScene = new Phaser.Class({

  Extends: Phaser.Scene,

  initialize: function PaperBoyScene() {
    Phaser.Scene.call(this, { key: 'PaperBoyScene' });

    // Scene objects
    this.clouds = [];
    this.currentHouse = null;
    this.newspaper = null;
    this.bikeGroup = null;
    this.houseIndex = 0;

    // Animation state
    this.bikeBobTime = 0;
    this.groundY = 0;
    this.timerBar = null;
    this.timerBarBg = null;
    this.easterEggActive = false;
  },

  create: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    // Sky gradient (light blue to white)
    this.drawSkyGradient(w, h);

    // Sun
    this.drawSun(w, h);

    // Parallax clouds
    this.createClouds(w, h);

    // Ground / street
    this.drawGround(w, h);

    // Timer bar (at top of scene)
    this.createTimerBar(w);

    // Boy on bike (right side)
    this.createBikeRider(w, h);

    // Start random Easter egg events
    this.startEasterEggs();

    // Notify PaperBoy that scene is ready
    if (typeof PaperBoy !== 'undefined' && PaperBoy._pendingInit) {
      PaperBoy._pendingInit(this);
      PaperBoy._pendingInit = null;
    }
  },

  update: function (time, delta) {
    // Bike bobbing animation
    this.bikeBobTime += delta * 0.003;
    if (this.bikeGroup) {
      this.bikeGroup.y = this.bikeBaseY + Math.sin(this.bikeBobTime) * 3;
      // Slight wheel rotation visual via tint cycling (simulated)
    }

    // Cloud parallax movement
    for (var i = 0; i < this.clouds.length; i++) {
      var cloud = this.clouds[i];
      cloud.x += cloud.getData('speed') * (delta / 1000);
      if (cloud.x > this.scale.width + 120) {
        cloud.x = -120;
      }
    }
  },

  // --- Sky & Background ---

  drawSkyGradient: function (w, h) {
    var gfx = this.add.graphics();
    var steps = 20;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      // Light blue at top -> paler blue at bottom
      var r = Math.round(135 + t * 50);
      var g = Math.round(206 + t * 30);
      var b = Math.round(235 + t * 15);
      var color = (r << 16) | (g << 8) | b;
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, (h * i) / steps, w, h / steps + 1);
    }
  },

  drawSun: function (w, h) {
    var gfx = this.add.graphics();
    var sunX = w * 0.15;
    var sunY = h * 0.12;
    var radius = Math.min(w, h) * 0.06;

    // Sun glow
    gfx.fillStyle(0xfff176, 0.2);
    gfx.fillCircle(sunX, sunY, radius * 2.5);
    gfx.fillStyle(0xfff176, 0.35);
    gfx.fillCircle(sunX, sunY, radius * 1.6);

    // Sun body
    gfx.fillStyle(0xffeb3b, 1);
    gfx.fillCircle(sunX, sunY, radius);
  },

  createClouds: function (w, h) {
    for (var i = 0; i < 5; i++) {
      var cloudGfx = this.add.graphics();
      var cx = Math.random() * w;
      var cy = h * 0.08 + Math.random() * h * 0.2;
      var scale = 0.5 + Math.random() * 0.6;
      var alpha = 0.7 + Math.random() * 0.3;

      cloudGfx.fillStyle(0xffffff, alpha);
      // Cloud shape: overlapping ellipses
      cloudGfx.fillEllipse(0, 0, 90 * scale, 35 * scale);
      cloudGfx.fillEllipse(35 * scale, -10 * scale, 70 * scale, 30 * scale);
      cloudGfx.fillEllipse(-30 * scale, 5 * scale, 60 * scale, 25 * scale);
      cloudGfx.fillEllipse(20 * scale, 10 * scale, 50 * scale, 20 * scale);

      cloudGfx.x = cx;
      cloudGfx.y = cy;
      cloudGfx.setData('speed', 8 + Math.random() * 15);
      this.clouds.push(cloudGfx);
    }
  },

  drawGround: function (w, h) {
    var groundY = h * 0.7;
    this.groundY = groundY;
    var gfx = this.add.graphics();

    // Grass area
    gfx.fillStyle(0x7cb342, 1);
    gfx.fillRect(0, groundY, w, h - groundY);

    // Sidewalk
    gfx.fillStyle(0xbdbdbd, 1);
    gfx.fillRect(0, groundY, w, 20);

    // Sidewalk edge
    gfx.fillStyle(0x9e9e9e, 1);
    gfx.fillRect(0, groundY + 18, w, 4);

    // Street
    gfx.fillStyle(0x424242, 1);
    gfx.fillRect(0, groundY + 22, w, h * 0.15);

    // Street lines (dashed)
    gfx.fillStyle(0xfff176, 1);
    var lineY = groundY + 22 + (h * 0.15) / 2;
    for (var x = 0; x < w; x += 50) {
      gfx.fillRect(x, lineY - 2, 30, 4);
    }

    // Bottom grass/curb
    gfx.fillStyle(0x558b2f, 1);
    gfx.fillRect(0, groundY + 22 + h * 0.15, w, h);
  },

  // --- Timer Bar ---

  createTimerBar: function (w) {
    this.timerBarBg = this.add.graphics();
    this.timerBarBg.fillStyle(0x000000, 0.25);
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

  // --- Boy on Bike ---

  createBikeRider: function (w, h) {
    this.bikeBaseY = this.groundY + 8;
    this.bikeGroup = this.add.container(w * 0.78, this.bikeBaseY);
    this.bikeGroup.setDepth(50);

    var gfx = this.add.graphics();

    // Bike frame (blue)
    gfx.lineStyle(4, 0x1976d2, 1);
    // Main triangle
    gfx.beginPath();
    gfx.moveTo(-10, -20); // seat
    gfx.lineTo(10, -20);  // handlebars
    gfx.lineTo(15, 0);    // front wheel center
    gfx.lineTo(-15, 0);   // back wheel center
    gfx.lineTo(-10, -20);
    gfx.strokePath();

    // Handlebars
    gfx.lineStyle(3, 0x1976d2, 1);
    gfx.beginPath();
    gfx.moveTo(10, -20);
    gfx.lineTo(18, -28);
    gfx.strokePath();

    // Seat
    gfx.fillStyle(0x5d4037, 1);
    gfx.fillEllipse(-10, -24, 12, 5);

    // Wheels
    gfx.lineStyle(3, 0x37474f, 1);
    gfx.strokeCircle(-15, 0, 14);
    gfx.strokeCircle(15, 0, 14);

    // Wheel centers (hubs)
    gfx.fillStyle(0x757575, 1);
    gfx.fillCircle(-15, 0, 4);
    gfx.fillCircle(15, 0, 4);

    // Spokes (simple)
    gfx.lineStyle(1, 0x9e9e9e, 1);
    for (var i = 0; i < 4; i++) {
      var angle = (i / 4) * Math.PI * 2;
      gfx.beginPath();
      gfx.moveTo(-15, 0);
      gfx.lineTo(-15 + Math.cos(angle) * 12, Math.sin(angle) * 12);
      gfx.strokePath();
      gfx.beginPath();
      gfx.moveTo(15, 0);
      gfx.lineTo(15 + Math.cos(angle) * 12, Math.sin(angle) * 12);
      gfx.strokePath();
    }

    // Boy body (red shirt)
    gfx.fillStyle(0xe53935, 1);
    gfx.fillCircle(-5, -35, 12);

    // Boy head
    gfx.fillStyle(0xffcc80, 1);
    gfx.fillCircle(-5, -52, 10);

    // Hair (brown cap)
    gfx.fillStyle(0x5d4037, 1);
    gfx.beginPath();
    gfx.arc(-5, -55, 10, Math.PI, 0);
    gfx.closePath();
    gfx.fillPath();

    // Cap brim
    gfx.fillStyle(0x5d4037, 1);
    gfx.fillRect(-16, -55, 20, 4);

    // Eyes
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(-2, -53, 2);

    // Smile
    gfx.lineStyle(2, 0x000000, 1);
    gfx.beginPath();
    gfx.arc(-5, -50, 4, 0.2, Math.PI - 0.2);
    gfx.strokePath();

    // Arm (holding newspaper bag)
    gfx.lineStyle(4, 0xffcc80, 1);
    gfx.beginPath();
    gfx.moveTo(3, -35);
    gfx.lineTo(18, -35);
    gfx.strokePath();

    // Newspaper bag (slung over shoulder)
    gfx.fillStyle(0x8d6e63, 1);
    gfx.fillRect(12, -42, 14, 20);
    gfx.fillStyle(0x6d4c41, 1);
    gfx.fillRect(12, -42, 14, 3);

    // Newspapers sticking out of bag
    gfx.fillStyle(0xfafafa, 1);
    gfx.fillRect(14, -40, 10, 4);
    gfx.fillRect(13, -36, 11, 4);

    // Legs on pedals
    gfx.lineStyle(4, 0x1565c0, 1);
    gfx.beginPath();
    gfx.moveTo(-5, -23);
    gfx.lineTo(-12, -10);
    gfx.lineTo(-15, 0);
    gfx.strokePath();

    this.bikeGroup.add(gfx);
  },

  // --- Houses ---

  showHouse: function (houseData) {
    var w = this.scale.width;
    var groundY = this.groundY;

    // Remove old house
    if (this.currentHouse) {
      this.currentHouse.destroy();
    }

    var houseGroup = this.add.container(w + 80, groundY);
    houseGroup.setDepth(30);

    var gfx = this.add.graphics();

    // House colors - cycle through suburban palette
    var wallColors = [0xffccbc, 0xbbdefb, 0xc8e6c9, 0xfff9c4, 0xe1bee7, 0xffecb3];
    var roofColors = [0x795548, 0x607d8b, 0x689f38, 0xf57f17, 0x7b1fa2, 0xff8f00];
    var colorIdx = this.houseIndex % wallColors.length;
    var wallColor = wallColors[colorIdx];
    var roofColor = roofColors[colorIdx];

    var houseW = 80;
    var houseH = 60;

    // Wall
    gfx.fillStyle(wallColor, 1);
    gfx.fillRect(-houseW / 2, -houseH, houseW, houseH);

    // Roof (triangle)
    gfx.fillStyle(roofColor, 1);
    gfx.beginPath();
    gfx.moveTo(-houseW / 2 - 10, -houseH);
    gfx.lineTo(0, -houseH - 35);
    gfx.lineTo(houseW / 2 + 10, -houseH);
    gfx.closePath();
    gfx.fillPath();

    // Windows (dark initially, light up on correct)
    this.windowRects = [];
    var winPositions = [
      { x: -22, y: -houseH + 14, w: 16, h: 16 },
      { x: 10, y: -houseH + 14, w: 16, h: 16 },
    ];
    for (var i = 0; i < winPositions.length; i++) {
      var wp = winPositions[i];
      gfx.fillStyle(0x263238, 0.7);
      gfx.fillRect(wp.x, wp.y, wp.w, wp.h);
      // Window frame
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(wp.x + wp.w / 2 - 1, wp.y, 2, wp.h);
      gfx.fillRect(wp.x, wp.y + wp.h / 2 - 1, wp.w, 2);
      this.windowRects.push(wp);
    }

    // Door
    gfx.fillStyle(0x5d4037, 1);
    gfx.fillRoundedRect(-8, -26, 16, 26, { tl: 4, tr: 4, bl: 0, br: 0 });
    // Doorknob
    gfx.fillStyle(0xffc107, 1);
    gfx.fillCircle(5, -12, 2.5);

    // Mailbox (prominent!)
    var mailboxX = 45;
    var mailboxY = -20;

    // Mailbox post
    gfx.fillStyle(0x8d6e63, 1);
    gfx.fillRect(mailboxX - 3, mailboxY, 6, 22);

    // Mailbox body
    gfx.fillStyle(0x1565c0, 1);
    gfx.fillRect(mailboxX - 12, mailboxY - 15, 24, 18);
    // Mailbox rounded top
    gfx.fillEllipse(mailboxX, mailboxY - 15, 24, 10);

    // Mailbox flag (down by default)
    this.mailboxFlag = this.add.graphics();
    this.mailboxFlag.fillStyle(0xe53935, 1);
    this.mailboxFlag.fillRect(0, 0, 3, 12);
    this.mailboxFlag.fillRect(3, 0, 8, 6);
    this.mailboxFlag.x = mailboxX + 10;
    this.mailboxFlag.y = mailboxY - 10;
    this.mailboxFlag.angle = 90; // Flag down

    // Front yard decorations (random)
    if (Math.random() > 0.5) {
      // Bush
      gfx.fillStyle(0x388e3c, 1);
      gfx.fillCircle(-35, -8, 10);
      gfx.fillCircle(-30, -5, 8);
    }
    if (Math.random() > 0.6) {
      // Flower
      gfx.fillStyle(0xe91e63, 1);
      gfx.fillCircle(30, -6, 5);
      gfx.fillStyle(0xffc107, 1);
      gfx.fillCircle(30, -6, 2);
    }

    houseGroup.add(gfx);
    houseGroup.add(this.mailboxFlag);
    this.currentHouse = houseGroup;
    this.houseGfx = gfx;
    this.houseIndex++;

    // Scroll house into position
    var targetX = w * 0.35;
    this.tweens.add({
      targets: houseGroup,
      x: targetX,
      duration: 700,
      ease: 'Power2',
    });
  },

  // --- Newspaper Throw ---

  throwNewspaper: function (correct, onComplete) {
    var w = this.scale.width;
    var startX = w * 0.78 + 18;
    var startY = this.bikeBaseY - 35;
    var targetHouseX = w * 0.35;

    // Create newspaper
    var paperGfx = this.add.graphics();
    paperGfx.setDepth(55);

    // Folded newspaper shape
    gfx = paperGfx;
    gfx.fillStyle(0xfafafa, 1);
    gfx.fillRect(-8, -4, 16, 8);
    gfx.fillStyle(0xe0e0e0, 1);
    gfx.fillRect(-8, -4, 16, 2);
    gfx.fillStyle(0x757575, 1);
    gfx.fillRect(-6, -1, 12, 1);
    gfx.fillRect(-6, 1, 8, 1);

    paperGfx.x = startX;
    paperGfx.y = startY;

    var scene = this;

    if (correct) {
      // Perfect throw to mailbox
      var mailboxX = targetHouseX + 45;
      var mailboxY = this.groundY - 20;

      this.tweens.add({
        targets: paperGfx,
        x: mailboxX,
        y: mailboxY - 8,
        angle: 360,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: function () {
          paperGfx.destroy();

          // Mailbox celebration
          scene.mailboxSuccess(mailboxX, mailboxY);

          if (onComplete) onComplete();
        },
      });
    } else {
      // Miss animation - pick randomly from 5 types
      var missType = Math.floor(Math.random() * 5);
      this.doMissAnimation(paperGfx, missType, targetHouseX, onComplete);
    }
  },

  mailboxSuccess: function (x, y) {
    // Flag pops up
    if (this.mailboxFlag) {
      this.tweens.add({
        targets: this.mailboxFlag,
        angle: 0,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }

    // Particle burst
    var burstGfx = this.make.graphics({ x: 0, y: 0, add: false });
    burstGfx.fillStyle(0xffc107, 1);
    burstGfx.fillCircle(4, 4, 4);
    burstGfx.generateTexture('paperburst', 8, 8);
    burstGfx.destroy();

    var emitter = this.add.particles(x, y, 'paperburst', {
      speed: { min: 30, max: 80 },
      angle: { min: 200, max: 340 },
      lifespan: 500,
      scale: { start: 0.7, end: 0 },
      quantity: 10,
      tint: [0xffc107, 0x4caf50, 0x2196f3],
      emitting: false,
    });
    emitter.setDepth(60);
    emitter.explode();

    var scene = this;
    this.time.delayedCall(800, function () {
      emitter.destroy();
    });

    // Light up house windows
    this.lightUpHouse();
  },

  lightUpHouse: function () {
    if (!this.houseGfx || !this.windowRects) return;

    for (var i = 0; i < this.windowRects.length; i++) {
      var wp = this.windowRects[i];
      this.houseGfx.fillStyle(0xfff9c4, 0.9);
      this.houseGfx.fillRect(wp.x, wp.y, wp.w, wp.h);
    }
  },

  // --- Miss Animations ---

  doMissAnimation: function (paperGfx, type, houseX, onComplete) {
    var scene = this;

    switch (type) {
      case 0: // Roof - overshoots, bounces off
        this.missRoof(paperGfx, houseX, onComplete);
        break;
      case 1: // Street - undershoots, splats on pavement
        this.missStreet(paperGfx, houseX, onComplete);
        break;
      case 2: // Bushes - lands in bushes, rustles
        this.missBushes(paperGfx, houseX, onComplete);
        break;
      case 3: // Dog catches it and runs away
        this.missDog(paperGfx, houseX, onComplete);
        break;
      case 4: // Window - hits window, bounces off
        this.missWindow(paperGfx, houseX, onComplete);
        break;
    }
  },

  missRoof: function (paper, houseX, onComplete) {
    var scene = this;
    var roofY = this.groundY - 95;

    // Arc up to roof
    this.tweens.add({
      targets: paper,
      x: houseX,
      y: roofY,
      angle: 540,
      duration: 450,
      ease: 'Quad.easeOut',
      onComplete: function () {
        // Bounce down
        scene.tweens.add({
          targets: paper,
          x: houseX - 30,
          y: scene.groundY + 20,
          angle: 900,
          duration: 600,
          ease: 'Bounce.easeOut',
          onComplete: function () {
            scene.fadeOutPaper(paper, onComplete);
          },
        });
      },
    });
  },

  missStreet: function (paper, houseX, onComplete) {
    var scene = this;
    var streetY = this.groundY + 35;

    // Low arc, hits street
    this.tweens.add({
      targets: paper,
      x: houseX + 20,
      y: streetY,
      angle: 180,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: function () {
        // Flatten/splat effect
        scene.tweens.add({
          targets: paper,
          scaleY: 0.3,
          duration: 100,
          onComplete: function () {
            scene.fadeOutPaper(paper, onComplete);
          },
        });
      },
    });
  },

  missBushes: function (paper, houseX, onComplete) {
    var scene = this;
    var bushX = houseX - 35;
    var bushY = this.groundY - 8;

    // Arc into bushes
    this.tweens.add({
      targets: paper,
      x: bushX,
      y: bushY,
      angle: 270,
      duration: 450,
      ease: 'Quad.easeOut',
      onComplete: function () {
        // Hide in bush
        paper.alpha = 0.3;

        // Rustling leaves
        scene.createRustleEffect(bushX, bushY);

        scene.time.delayedCall(800, function () {
          paper.destroy();
          if (onComplete) onComplete();
        });
      },
    });
  },

  createRustleEffect: function (x, y) {
    var leafGfx = this.make.graphics({ x: 0, y: 0, add: false });
    leafGfx.fillStyle(0x4caf50, 1);
    leafGfx.fillCircle(4, 4, 4);
    leafGfx.generateTexture('leaf', 8, 8);
    leafGfx.destroy();

    var emitter = this.add.particles(x, y, 'leaf', {
      speed: { min: 20, max: 50 },
      angle: { min: 220, max: 320 },
      lifespan: 600,
      scale: { start: 0.5, end: 0 },
      quantity: 6,
      tint: [0x4caf50, 0x388e3c, 0x2e7d32],
      emitting: false,
    });
    emitter.setDepth(35);
    emitter.explode();

    this.time.delayedCall(800, function () {
      emitter.destroy();
    });
  },

  missDog: function (paper, houseX, onComplete) {
    var scene = this;
    var dogStartX = houseX + 60;
    var groundY = this.groundY;

    // Paper arcs toward house
    this.tweens.add({
      targets: paper,
      x: houseX + 20,
      y: groundY - 15,
      angle: 360,
      duration: 400,
      ease: 'Quad.easeOut',
    });

    // Create dog that runs in and catches it
    var dog = this.add.container(dogStartX, groundY - 10);
    dog.setDepth(45);

    var dogGfx = this.add.graphics();

    // Dog body (brown)
    dogGfx.fillStyle(0x8d6e63, 1);
    dogGfx.fillEllipse(0, 0, 30, 16);

    // Dog head
    dogGfx.fillCircle(15, -5, 10);

    // Ears
    dogGfx.fillStyle(0x6d4c41, 1);
    dogGfx.beginPath();
    dogGfx.moveTo(10, -12);
    dogGfx.lineTo(8, -22);
    dogGfx.lineTo(14, -14);
    dogGfx.closePath();
    dogGfx.fillPath();
    dogGfx.beginPath();
    dogGfx.moveTo(18, -12);
    dogGfx.lineTo(22, -20);
    dogGfx.lineTo(22, -12);
    dogGfx.closePath();
    dogGfx.fillPath();

    // Nose
    dogGfx.fillStyle(0x000000, 1);
    dogGfx.fillCircle(24, -5, 3);

    // Eye
    dogGfx.fillStyle(0x000000, 1);
    dogGfx.fillCircle(18, -8, 2);

    // Legs (simple)
    dogGfx.fillStyle(0x8d6e63, 1);
    dogGfx.fillRect(-10, 5, 5, 10);
    dogGfx.fillRect(-2, 5, 5, 10);
    dogGfx.fillRect(5, 5, 5, 10);
    dogGfx.fillRect(12, 5, 5, 10);

    // Tail (wagging)
    dogGfx.fillStyle(0x8d6e63, 1);
    dogGfx.fillRect(-18, -5, 8, 4);

    dog.add(dogGfx);

    // Dog runs in to catch
    this.tweens.add({
      targets: dog,
      x: houseX + 20,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: function () {
        // "Catch" the paper
        paper.destroy();

        // Dog runs away with paper
        scene.tweens.add({
          targets: dog,
          x: -60,
          duration: 1200,
          ease: 'Linear',
          onComplete: function () {
            dog.destroy();
            if (onComplete) onComplete();
          },
        });

        // Bobbing run animation
        scene.tweens.add({
          targets: dog,
          y: groundY - 15,
          duration: 100,
          yoyo: true,
          repeat: 10,
        });
      },
    });
  },

  missWindow: function (paper, houseX, onComplete) {
    var scene = this;
    var windowX = houseX - 22 + 8;
    var windowY = this.groundY - 46;

    // Arc to window
    this.tweens.add({
      targets: paper,
      x: windowX,
      y: windowY,
      angle: 360,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: function () {
        // Bounce off
        scene.tweens.add({
          targets: paper,
          x: windowX - 30,
          y: scene.groundY + 10,
          angle: 720,
          duration: 400,
          ease: 'Bounce.easeOut',
          onComplete: function () {
            scene.fadeOutPaper(paper, onComplete);
          },
        });
      },
    });
  },

  fadeOutPaper: function (paper, onComplete) {
    var scene = this;
    this.tweens.add({
      targets: paper,
      alpha: 0,
      duration: 400,
      onComplete: function () {
        paper.destroy();
        if (onComplete) onComplete();
      },
    });
  },

  // --- House Transition ---

  scrollHouseOut: function (onComplete) {
    if (!this.currentHouse) {
      if (onComplete) onComplete();
      return;
    }

    var scene = this;
    this.tweens.add({
      targets: this.currentHouse,
      x: -120,
      duration: 500,
      ease: 'Power2',
      onComplete: function () {
        if (scene.currentHouse) {
          scene.currentHouse.destroy();
          scene.currentHouse = null;
        }
        if (onComplete) onComplete();
      },
    });
  },

  // --- Victory ---

  showVictoryAnimation: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    // Confetti burst
    var confettiGfx = this.make.graphics({ x: 0, y: 0, add: false });
    confettiGfx.fillStyle(0xffffff, 1);
    confettiGfx.fillRect(0, 0, 8, 8);
    confettiGfx.generateTexture('confetti', 8, 8);
    confettiGfx.destroy();

    for (var i = 0; i < 3; i++) {
      (function (idx) {
        var delay = idx * 300;
        this.time.delayedCall(delay, function () {
          var x = w * 0.2 + Math.random() * w * 0.6;
          var emitter = this.add.particles(x, -10, 'confetti', {
            speed: { min: 50, max: 150 },
            angle: { min: 70, max: 110 },
            lifespan: 2000,
            scale: { start: 0.6, end: 0.2 },
            quantity: 20,
            tint: [0xe91e63, 0xffc107, 0x4caf50, 0x2196f3, 0x9c27b0],
            emitting: false,
          });
          emitter.setDepth(80);
          emitter.explode();

          this.time.delayedCall(2500, function () {
            emitter.destroy();
          });
        }.bind(this));
      }.bind(this))(i);
    }

    // Bike does a wheelie and rides off
    if (this.bikeGroup) {
      this.tweens.add({
        targets: this.bikeGroup,
        angle: -15,
        duration: 300,
        ease: 'Back.easeOut',
        onComplete: function () {
          this.tweens.add({
            targets: this.bikeGroup,
            x: this.scale.width + 100,
            duration: 1500,
            ease: 'Quad.easeIn',
          });
        }.bind(this),
      });
    }
  },

  // ─── EASTER EGGS ─────────────────────────────────────────────

  startEasterEggs: function () {
    this.easterEggActive = false;
    this.scheduleNextEasterEgg();
  },

  scheduleNextEasterEgg: function () {
    var delay = 10000 + Math.random() * 12000;
    this.time.delayedCall(delay, function () {
      if (!this.scene.isActive()) return;
      this.spawnRandomEvent();
      this.scheduleNextEasterEgg();
    }.bind(this));
  },

  spawnRandomEvent: function () {
    if (this.easterEggActive) return;
    this.easterEggActive = true;

    var roll = Math.random() * 100;
    if (roll < 30) {
      this.eggBird();
    } else if (roll < 55) {
      this.eggButterfly();
    } else if (roll < 75) {
      this.eggCat();
    } else if (roll < 90) {
      this.eggAirplane();
    } else {
      this.eggIceCreamTruck();
    }
  },

  // --- Bird flies across ---
  eggBird: function () {
    var w = this.scale.width;
    var h = this.scale.height;
    var y = h * 0.15 + Math.random() * h * 0.2;
    var fromLeft = Math.random() > 0.5;
    var startX = fromLeft ? -30 : w + 30;
    var endX = fromLeft ? w + 30 : -30;

    var bird = this.add.container(startX, y);
    bird.setDepth(40);
    var gfx = this.add.graphics();

    // Bird body
    gfx.fillStyle(0x37474f, 1);
    gfx.fillEllipse(0, 0, 16, 8);

    // Head
    gfx.fillCircle(8 * (fromLeft ? 1 : -1), -2, 5);

    // Beak
    gfx.fillStyle(0xff9800, 1);
    gfx.beginPath();
    gfx.moveTo(12 * (fromLeft ? 1 : -1), -2);
    gfx.lineTo(18 * (fromLeft ? 1 : -1), -1);
    gfx.lineTo(12 * (fromLeft ? 1 : -1), 0);
    gfx.closePath();
    gfx.fillPath();

    // Wings (will flap)
    var wing = this.add.graphics();
    wing.fillStyle(0x546e7a, 1);
    wing.beginPath();
    wing.moveTo(0, 0);
    wing.lineTo(-8, -12);
    wing.lineTo(8, -12);
    wing.closePath();
    wing.fillPath();
    wing.y = -4;

    bird.add(gfx);
    bird.add(wing);

    var scene = this;

    // Wing flap
    this.tweens.add({
      targets: wing,
      angle: 20,
      duration: 150,
      yoyo: true,
      repeat: -1,
    });

    // Bob up and down
    this.tweens.add({
      targets: bird,
      y: y - 8,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Fly across
    this.tweens.add({
      targets: bird,
      x: endX,
      duration: 3000 + Math.random() * 1500,
      ease: 'Linear',
      onComplete: function () {
        bird.destroy();
        scene.easterEggActive = false;
      },
    });
  },

  // --- Butterfly ---
  eggButterfly: function () {
    var w = this.scale.width;
    var h = this.scale.height;
    var startX = Math.random() * w * 0.3;
    var startY = h * 0.4 + Math.random() * h * 0.2;

    var butterfly = this.add.container(startX, startY);
    butterfly.setDepth(38);

    var colors = [0xe91e63, 0xffc107, 0x9c27b0, 0x2196f3];
    var wingColor = colors[Math.floor(Math.random() * colors.length)];

    var gfx = this.add.graphics();

    // Body
    gfx.fillStyle(0x000000, 1);
    gfx.fillEllipse(0, 0, 4, 12);

    // Wings
    var leftWing = this.add.graphics();
    leftWing.fillStyle(wingColor, 0.8);
    leftWing.fillEllipse(-10, 0, 14, 10);
    leftWing.fillStyle(wingColor, 0.6);
    leftWing.fillCircle(-12, 5, 5);

    var rightWing = this.add.graphics();
    rightWing.fillStyle(wingColor, 0.8);
    rightWing.fillEllipse(10, 0, 14, 10);
    rightWing.fillStyle(wingColor, 0.6);
    rightWing.fillCircle(12, 5, 5);

    butterfly.add(leftWing);
    butterfly.add(rightWing);
    butterfly.add(gfx);

    var scene = this;

    // Wing flutter
    this.tweens.add({
      targets: [leftWing, rightWing],
      scaleX: 0.5,
      duration: 100,
      yoyo: true,
      repeat: -1,
    });

    // Erratic flight path
    var points = [];
    for (var i = 0; i < 6; i++) {
      points.push({
        x: startX + (w * 0.7 * i / 5) + (Math.random() - 0.5) * 80,
        y: startY + (Math.random() - 0.5) * 100,
      });
    }

    this.tweens.add({
      targets: butterfly,
      x: points.map(function (p) { return p.x; }),
      y: points.map(function (p) { return p.y; }),
      duration: 5000,
      ease: 'Sine.easeInOut',
      onComplete: function () {
        butterfly.destroy();
        scene.easterEggActive = false;
      },
    });
  },

  // --- Cat walks across ---
  eggCat: function () {
    var w = this.scale.width;
    var groundY = this.groundY;
    var fromLeft = Math.random() > 0.5;
    var startX = fromLeft ? -40 : w + 40;
    var endX = fromLeft ? w + 40 : -40;

    var cat = this.add.container(startX, groundY - 12);
    cat.setDepth(36);
    var gfx = this.add.graphics();
    var dir = fromLeft ? 1 : -1;

    // Body
    gfx.fillStyle(0xff9800, 1);
    gfx.fillEllipse(0, 0, 28, 14);

    // Head
    gfx.fillCircle(14 * dir, -4, 10);

    // Ears
    gfx.fillStyle(0xff9800, 1);
    gfx.beginPath();
    gfx.moveTo((10 + 4) * dir, -12);
    gfx.lineTo((10 + 2) * dir, -22);
    gfx.lineTo((10 + 8) * dir, -14);
    gfx.closePath();
    gfx.fillPath();
    gfx.beginPath();
    gfx.moveTo((18 + 2) * dir, -12);
    gfx.lineTo((18 + 6) * dir, -20);
    gfx.lineTo((18 + 8) * dir, -10);
    gfx.closePath();
    gfx.fillPath();

    // Inner ears
    gfx.fillStyle(0xffccbc, 1);
    gfx.beginPath();
    gfx.moveTo((10 + 4) * dir, -12);
    gfx.lineTo((10 + 3) * dir, -18);
    gfx.lineTo((10 + 6) * dir, -13);
    gfx.closePath();
    gfx.fillPath();

    // Eyes
    gfx.fillStyle(0x4caf50, 1);
    gfx.fillCircle((12) * dir, -6, 3);
    gfx.fillCircle((17) * dir, -6, 3);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle((12) * dir, -6, 1.5);
    gfx.fillCircle((17) * dir, -6, 1.5);

    // Nose
    gfx.fillStyle(0xe91e63, 1);
    gfx.beginPath();
    gfx.moveTo(22 * dir, -3);
    gfx.lineTo(20 * dir, 0);
    gfx.lineTo(24 * dir, 0);
    gfx.closePath();
    gfx.fillPath();

    // Tail
    gfx.lineStyle(5, 0xff9800, 1);
    gfx.beginPath();
    gfx.moveTo(-14 * dir, 0);
    gfx.lineTo(-20 * dir, -5);
    gfx.lineTo(-22 * dir, -15);
    gfx.strokePath();

    // Legs
    gfx.fillStyle(0xff9800, 1);
    gfx.fillRect(-8, 5, 4, 8);
    gfx.fillRect(-2, 5, 4, 8);
    gfx.fillRect(4, 5, 4, 8);
    gfx.fillRect(10, 5, 4, 8);

    cat.add(gfx);

    var scene = this;

    // Walk bob
    this.tweens.add({
      targets: cat,
      y: groundY - 14,
      duration: 200,
      yoyo: true,
      repeat: -1,
    });

    // Walk across
    this.tweens.add({
      targets: cat,
      x: endX,
      duration: 4000 + Math.random() * 2000,
      ease: 'Linear',
      onComplete: function () {
        cat.destroy();
        scene.easterEggActive = false;
      },
    });
  },

  // --- Airplane flies overhead ---
  eggAirplane: function () {
    var w = this.scale.width;
    var h = this.scale.height;
    var y = h * 0.08 + Math.random() * h * 0.1;
    var fromLeft = Math.random() > 0.5;
    var startX = fromLeft ? -60 : w + 60;
    var endX = fromLeft ? w + 60 : -60;
    var dir = fromLeft ? 1 : -1;

    var plane = this.add.container(startX, y);
    plane.setDepth(42);
    var gfx = this.add.graphics();

    // Fuselage
    gfx.fillStyle(0xfafafa, 1);
    gfx.fillEllipse(0, 0, 50, 14);

    // Nose
    gfx.fillStyle(0x78909c, 1);
    gfx.beginPath();
    gfx.moveTo(25 * dir, 0);
    gfx.lineTo(35 * dir, -2);
    gfx.lineTo(35 * dir, 2);
    gfx.closePath();
    gfx.fillPath();

    // Wings
    gfx.fillStyle(0xeceff1, 1);
    gfx.fillRect(-8, -3, 20, 35);

    // Tail
    gfx.fillStyle(0xeceff1, 1);
    gfx.beginPath();
    gfx.moveTo(-20 * dir, -5);
    gfx.lineTo(-30 * dir, -18);
    gfx.lineTo(-30 * dir, -5);
    gfx.closePath();
    gfx.fillPath();

    // Windows
    gfx.fillStyle(0x03a9f4, 1);
    for (var i = 0; i < 4; i++) {
      gfx.fillCircle((-12 + i * 8) * dir, -2, 2);
    }

    plane.add(gfx);
    if (!fromLeft) plane.scaleX = -1;

    // Trail behind
    var trailGfx = this.make.graphics({ x: 0, y: 0, add: false });
    trailGfx.fillStyle(0xffffff, 1);
    trailGfx.fillCircle(3, 3, 3);
    trailGfx.generateTexture('contrail', 6, 6);
    trailGfx.destroy();

    var trail = this.add.particles(startX, y, 'contrail', {
      speed: { min: 5, max: 15 },
      lifespan: 1500,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.4, end: 0 },
      frequency: 50,
      quantity: 1,
    });
    trail.setDepth(41);

    var scene = this;

    this.tweens.add({
      targets: plane,
      x: endX,
      duration: 4000 + Math.random() * 2000,
      ease: 'Linear',
      onUpdate: function () {
        trail.setPosition(plane.x - 25 * dir, plane.y);
      },
      onComplete: function () {
        plane.destroy();
        trail.stop();
        scene.time.delayedCall(1500, function () {
          trail.destroy();
        });
        scene.easterEggActive = false;
      },
    });
  },

  // --- Ice cream truck ---
  eggIceCreamTruck: function () {
    var w = this.scale.width;
    var groundY = this.groundY;
    var fromLeft = Math.random() > 0.5;
    var startX = fromLeft ? -80 : w + 80;
    var endX = fromLeft ? w + 80 : -80;

    var truck = this.add.container(startX, groundY + 30);
    truck.setDepth(37);
    var gfx = this.add.graphics();
    var dir = fromLeft ? 1 : -1;

    // Truck body
    gfx.fillStyle(0xfafafa, 1);
    gfx.fillRect(-30, -35, 60, 30);

    // Cab
    gfx.fillStyle(0xe91e63, 1);
    gfx.fillRect(25 * dir, -30, 20, 25);

    // Windshield
    gfx.fillStyle(0x81d4fa, 1);
    gfx.fillRect((28 + (dir > 0 ? 0 : 5)) * dir, -28, 12, 12);

    // Ice cream cone decoration
    gfx.fillStyle(0xffecb3, 1);
    gfx.beginPath();
    gfx.moveTo(-10, -35);
    gfx.lineTo(-5, -50);
    gfx.lineTo(0, -35);
    gfx.closePath();
    gfx.fillPath();

    // Ice cream scoops
    gfx.fillStyle(0xe91e63, 1);
    gfx.fillCircle(-5, -52, 8);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(-8, -58, 6);
    gfx.fillStyle(0x8d6e63, 1);
    gfx.fillCircle(-2, -56, 5);

    // Wheels
    gfx.fillStyle(0x37474f, 1);
    gfx.fillCircle(-18, 0, 10);
    gfx.fillCircle(18, 0, 10);
    gfx.fillStyle(0x757575, 1);
    gfx.fillCircle(-18, 0, 4);
    gfx.fillCircle(18, 0, 4);

    // "ICE CREAM" text (represented as lines)
    gfx.fillStyle(0x03a9f4, 1);
    gfx.fillRect(-20, -28, 35, 3);
    gfx.fillRect(-18, -22, 30, 2);

    truck.add(gfx);
    if (!fromLeft) truck.scaleX = -1;

    var scene = this;

    // Bounce as it drives
    this.tweens.add({
      targets: truck,
      y: groundY + 28,
      duration: 150,
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: truck,
      x: endX,
      duration: 4500 + Math.random() * 2000,
      ease: 'Linear',
      onComplete: function () {
        truck.destroy();
        scene.easterEggActive = false;
      },
    });
  },

  // ─── END EASTER EGGS ───────────────────────────────────────

  // --- Cleanup ---

  shutdown: function () {
    this.clouds = [];
    this.windowRects = [];
    if (this.currentHouse) {
      this.currentHouse.destroy();
      this.currentHouse = null;
    }
  },
});
