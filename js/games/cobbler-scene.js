/**
 * Cobbler's Workshop Scene - Phaser 3 Scene with all game visuals.
 * Warm workshop background, workbench, tools on wall, display shelf,
 * shoe construction animation, order scroll.
 *
 * All art is drawn with Phaser Graphics API (zero external assets).
 */

var CobblersScene = new Phaser.Class({

  Extends: Phaser.Scene,

  initialize: function CobblersScene() {
    Phaser.Scene.call(this, { key: 'CobblersScene' });

    // Scene objects
    this.workbenchGroup = null;
    this.shoeGroup = null;
    this.shelfSlots = [];
    this.completedShoes = [];
    this.timerBar = null;
    this.timerBarBg = null;
    this.orderScroll = null;
    this.lampGlow = null;
    this.lampTime = 0;
    this.hammerGroup = null;

    // Shoe state
    this.lastPartIndex = -1;
    this.shoeColors = [0xc0392b, 0x2980b9, 0x27ae60, 0x8e44ad, 0xe67e22, 0xe84393];
    this.currentShoeColor = 0xc0392b;
    this.shoeIndex = 0;

    // Layout
    this.workbenchY = 0;
    this.shoeArea = { x: 0, y: 0 };

    // Elf character
    this.elfContainer = null;
    this.elfArm = null;
    this.elfBody = null;
    this.elfHead = null;
    this.elfExpression = 'happy';
    this.elfIdleTween = null;

    // Customer window
    this.windowGroup = null;
    this.customerContainer = null;
    this.currentCustomer = null;
    this.customerPool = [
      { skin: 0xFFDBAC, hair: 0xF5D76E, type: 'girl' },  // Light, blonde
      { skin: 0xD4A574, hair: 0x5D4037, type: 'boy' },   // Medium, brown
      { skin: 0x8D5524, hair: 0x2C1810, type: 'girl' },  // Dark, black
      { skin: 0xFFDBAC, hair: 0xC0392B, type: 'boy' },   // Light, red
      { skin: 0xC4A67C, hair: 0x2C1810, type: 'girl' },  // Medium, black
      { skin: 0xE8BEAC, hair: 0x4A3728, type: 'boy' },   // Light-medium, brown
    ];

    // Silly reactions
    this.sillyReactions = ['googlyEyes', 'fire', 'waterSquirt', 'wiggle'];
    this.lastSillyIndex = -1;
  },

  create: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    // Workshop background
    this.drawBackground(w, h);

    // Wooden wall planks
    this.drawWallPlanks(w, h);

    // Tool rack on wall
    this.drawToolRack(w, h);

    // Hanging lamp with warm glow
    this.drawLamp(w, h);

    // Display shelf (top-right area)
    this.drawShelf(w, h);

    // Workbench (bottom area)
    this.drawWorkbench(w, h);

    // Timer bar (same pattern as Santa)
    this.createTimerBar(w);

    // Create hammer for bonk animation
    this.createHammer(w, h);

    // Create particle textures
    this.createParticleTextures();

    // Customer window (upper-left)
    this.createWindow(w, h);

    // Elf cobbler character
    this.createElf(w, h);

    // Notify CobblersWorkshop that scene is ready
    if (typeof CobblersWorkshop !== 'undefined' && CobblersWorkshop._pendingInit) {
      CobblersWorkshop._pendingInit(this);
      CobblersWorkshop._pendingInit = null;
    }
  },

  update: function (time, delta) {
    // Lamp flicker
    this.lampTime += delta * 0.003;
    if (this.lampGlow) {
      this.lampGlow.alpha = 0.15 + Math.sin(this.lampTime) * 0.04 + Math.sin(this.lampTime * 2.3) * 0.02;
    }
  },

  // --- Background ---

  drawBackground: function (w, h) {
    var gfx = this.add.graphics();
    // Warm gradient: amber/brown tones
    var steps = 20;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      // #8B7355 (139,115,85) -> #6B4226 (107,66,38)
      var r = Math.round(139 - t * 32);
      var g = Math.round(115 - t * 49);
      var b = Math.round(85 - t * 47);
      var color = (r << 16) | (g << 8) | b;
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, (h * i) / steps, w, h / steps + 1);
    }
  },

  drawWallPlanks: function (w, h) {
    var gfx = this.add.graphics();
    var wallH = h * 0.55;
    var plankCount = 8;
    var plankH = wallH / plankCount;

    for (var i = 0; i < plankCount; i++) {
      // Subtle color variation per plank
      var shade = 0.92 + Math.sin(i * 1.7) * 0.08;
      var r = Math.round(160 * shade);
      var g = Math.round(130 * shade);
      var b = Math.round(95 * shade);
      var color = (r << 16) | (g << 8) | b;

      gfx.fillStyle(color, 1);
      gfx.fillRect(0, i * plankH, w, plankH - 1);

      // Plank gap line
      gfx.fillStyle(0x5C3D1E, 0.4);
      gfx.fillRect(0, (i + 1) * plankH - 1, w, 1);
    }
  },

  drawToolRack: function (w, h) {
    var gfx = this.add.graphics();
    var rackY = h * 0.08;
    var rackX = w * 0.08;

    // Rack bar
    gfx.fillStyle(0x5C3D1E, 0.8);
    gfx.fillRect(rackX, rackY, w * 0.25, 4);

    // Hammer silhouette
    var hx = rackX + 15;
    gfx.fillStyle(0x4a3520, 0.7);
    gfx.fillRect(hx, rackY + 4, 4, 28); // handle
    gfx.fillRect(hx - 6, rackY + 4, 16, 8); // head

    // Awl silhouette
    var ax = rackX + 45;
    gfx.fillStyle(0x4a3520, 0.7);
    gfx.fillRect(ax, rackY + 4, 3, 30); // shaft
    gfx.beginPath();
    gfx.moveTo(ax - 1, rackY + 34);
    gfx.lineTo(ax + 1.5, rackY + 44);
    gfx.lineTo(ax + 4, rackY + 34);
    gfx.closePath();
    gfx.fillPath();

    // Thread spool
    var sx = rackX + 80;
    gfx.fillStyle(0x4a3520, 0.7);
    gfx.fillRect(sx, rackY + 4, 3, 8);
    gfx.fillStyle(0xc0392b, 0.6);
    gfx.fillCircle(sx + 1.5, rackY + 20, 8);
    gfx.fillStyle(0x4a3520, 0.5);
    gfx.fillCircle(sx + 1.5, rackY + 20, 3);

    // Scissors
    var scx = rackX + 115;
    gfx.fillStyle(0x4a3520, 0.7);
    gfx.lineStyle(2, 0x4a3520, 0.7);
    gfx.beginPath();
    gfx.moveTo(scx, rackY + 6);
    gfx.lineTo(scx + 8, rackY + 28);
    gfx.moveTo(scx + 12, rackY + 6);
    gfx.lineTo(scx + 4, rackY + 28);
    gfx.strokePath();
    gfx.fillCircle(scx, rackY + 6, 3);
    gfx.fillCircle(scx + 12, rackY + 6, 3);
  },

  drawLamp: function (w, h) {
    var gfx = this.add.graphics();
    var lampX = w * 0.5;
    var lampY = h * 0.02;

    // Chain/cord
    gfx.fillStyle(0x5C3D1E, 0.8);
    gfx.fillRect(lampX - 1, 0, 3, lampY + 10);

    // Lamp shade (trapezoid)
    gfx.fillStyle(0x8B6914, 1);
    gfx.beginPath();
    gfx.moveTo(lampX - 14, lampY + 10);
    gfx.lineTo(lampX - 20, lampY + 28);
    gfx.lineTo(lampX + 20, lampY + 28);
    gfx.lineTo(lampX + 14, lampY + 10);
    gfx.closePath();
    gfx.fillPath();

    // Lamp rim
    gfx.fillStyle(0x6B4226, 1);
    gfx.fillRect(lampX - 21, lampY + 27, 42, 3);

    // Warm glow (large soft circle)
    this.lampGlow = this.add.graphics();
    this.lampGlow.fillStyle(0xFFD700, 1);
    this.lampGlow.fillCircle(lampX, lampY + 35, 60);
    this.lampGlow.alpha = 0.15;
    this.lampGlow.setDepth(1);

    // Bulb
    gfx.fillStyle(0xFFF9C4, 0.9);
    gfx.fillCircle(lampX, lampY + 22, 5);
  },

  drawShelf: function (w, h) {
    var gfx = this.add.graphics();
    this.shelfSlots = [];

    // Shelf dimensions - top area, spanning most of width
    var shelfY = h * 0.18;
    var shelfW = w * 0.7;
    var shelfX = (w - shelfW) / 2;
    var slotCount = 10;
    var slotW = shelfW / slotCount;

    // Shelf board
    gfx.fillStyle(0x6B4226, 0.9);
    gfx.fillRect(shelfX, shelfY + 28, shelfW, 5);

    // Shelf brackets
    gfx.fillStyle(0x5C3D1E, 0.8);
    gfx.fillRect(shelfX + 10, shelfY + 33, 4, 10);
    gfx.fillRect(shelfX + shelfW - 14, shelfY + 33, 4, 10);

    // Slot positions (for placing completed shoes)
    for (var i = 0; i < slotCount; i++) {
      this.shelfSlots.push({
        x: shelfX + slotW * i + slotW / 2,
        y: shelfY + 18,
      });
    }

    // Slight shadow below shelf
    gfx.fillStyle(0x000000, 0.1);
    gfx.fillRect(shelfX, shelfY + 33, shelfW, 6);
  },

  drawWorkbench: function (w, h) {
    this.workbenchY = h * 0.52;
    var benchH = h * 0.48;
    var gfx = this.add.graphics();
    gfx.setDepth(5);

    // Workbench top surface
    gfx.fillStyle(0x8B6914, 1);
    gfx.fillRect(0, this.workbenchY, w, benchH);

    // Lighter top edge (3D effect)
    gfx.fillStyle(0xA67C52, 1);
    gfx.fillRect(0, this.workbenchY, w, 6);

    // Darker bottom edge
    gfx.fillStyle(0x5C3D1E, 1);
    gfx.fillRect(0, this.workbenchY + benchH - 4, w, 4);

    // Work area (lighter rectangle on surface)
    var areaW = w * 0.6;
    var areaH = benchH * 0.55;
    var areaX = (w - areaW) / 2;
    var areaY = this.workbenchY + 20;
    gfx.fillStyle(0xA68B5B, 0.4);
    gfx.fillRoundedRect(areaX, areaY, areaW, areaH, 8);

    // Shoe construction area center
    this.shoeArea = {
      x: w * 0.5,
      y: this.workbenchY + 20 + areaH * 0.5,
    };

    // Wood grain lines on bench
    gfx.lineStyle(1, 0x7A5C30, 0.2);
    for (var i = 0; i < 6; i++) {
      var ly = this.workbenchY + 15 + i * (benchH / 7);
      gfx.beginPath();
      gfx.moveTo(10, ly);
      for (var x = 10; x < w - 10; x += 30) {
        gfx.lineTo(x + 15, ly + Math.sin(x * 0.03 + i) * 2);
      }
      gfx.strokePath();
    }
  },

  createHammer: function (w, h) {
    this.hammerGroup = this.add.container(this.shoeArea.x + 80, this.workbenchY + 10);
    this.hammerGroup.setDepth(15);
    this.hammerGroup.alpha = 0;

    var gfx = this.add.graphics();
    // Handle
    gfx.fillStyle(0x8B6914, 1);
    gfx.fillRect(-3, 0, 6, 35);
    // Head
    gfx.fillStyle(0x636e72, 1);
    gfx.fillRect(-12, -5, 24, 12);
    // Head shine
    gfx.fillStyle(0x95a5a6, 0.5);
    gfx.fillRect(-10, -3, 20, 3);

    this.hammerGroup.add(gfx);
  },

  createParticleTextures: function () {
    // Sparkle particle
    var sparkGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sparkGfx.fillStyle(0xFFD700, 1);
    sparkGfx.fillCircle(4, 4, 4);
    sparkGfx.generateTexture('cw_sparkle', 8, 8);
    sparkGfx.destroy();

    // Dust particle
    var dustGfx = this.make.graphics({ x: 0, y: 0, add: false });
    dustGfx.fillStyle(0xA67C52, 1);
    dustGfx.fillCircle(3, 3, 3);
    dustGfx.generateTexture('cw_dust', 6, 6);
    dustGfx.destroy();
  },

  // --- Timer Bar ---

  createTimerBar: function (w) {
    this.timerBarBg = this.add.graphics();
    this.timerBarBg.fillStyle(0x000000, 0.3);
    this.timerBarBg.fillRoundedRect(w * 0.1, 8, w * 0.8, 8, 4);

    this.timerBar = this.add.graphics();
    this.timerBar.setDepth(100);
    this.timerBarBg.setDepth(99);

    // Start hidden; cobbler-game.js shows when timed mode
    this.timerBar.visible = false;
    this.timerBarBg.visible = false;
  },

  showTimerBar: function () {
    if (this.timerBar) this.timerBar.visible = true;
    if (this.timerBarBg) this.timerBarBg.visible = true;
  },

  hideTimerBar: function () {
    if (this.timerBar) this.timerBar.visible = false;
    if (this.timerBarBg) this.timerBarBg.visible = false;
  },

  updateTimerBar: function (ratio) {
    if (!this.timerBar) return;
    this.timerBar.clear();

    var w = this.scale.width;
    var barW = w * 0.8 * Math.max(0, ratio);

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

  // --- Order Scroll ---

  showOrder: function (orderData) {
    var w = this.scale.width;

    // Remove old shoe
    if (this.shoeGroup) {
      this.shoeGroup.destroy();
      this.shoeGroup = null;
    }
    this.lastPartIndex = -1;

    // Pick shoe color
    this.currentShoeColor = this.shoeColors[this.shoeIndex % this.shoeColors.length];

    // Remove old scroll
    if (this.orderScroll) {
      this.orderScroll.destroy();
      this.orderScroll = null;
    }

    // Create scroll
    var scroll = this.add.container(w + 60, this.workbenchY - 15);
    scroll.setDepth(20);

    var scrollGfx = this.add.graphics();
    // Parchment background
    scrollGfx.fillStyle(0xF5E6C8, 1);
    scrollGfx.fillRoundedRect(-35, -22, 70, 44, 6);
    // Border
    scrollGfx.lineStyle(2, 0xA67C52, 0.8);
    scrollGfx.strokeRoundedRect(-35, -22, 70, 44, 6);
    // Roll edges
    scrollGfx.fillStyle(0xE6D5B8, 1);
    scrollGfx.fillRect(-35, -22, 8, 44);
    scrollGfx.fillRect(27, -22, 8, 44);

    scroll.add(scrollGfx);

    // Emoji text on scroll
    if (orderData && orderData.emoji) {
      var emojiText = this.add.text(0, 0, orderData.emoji, {
        fontSize: '28px',
        align: 'center',
      });
      emojiText.setOrigin(0.5, 0.5);
      scroll.add(emojiText);
    }

    this.orderScroll = scroll;

    // Slide scroll in from right
    this.tweens.add({
      targets: scroll,
      x: w * 0.82,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Draw empty shoe outline on workbench
    this.drawShoeOutline();
  },

  drawShoeOutline: function () {
    this.shoeGroup = this.add.container(this.shoeArea.x, this.shoeArea.y);
    this.shoeGroup.setDepth(10);

    var outline = this.add.graphics();
    // Dashed shoe outline
    outline.lineStyle(2, 0xA67C52, 0.4);

    // Sole outline
    outline.strokeRoundedRect(-40, 10, 80, 16, 6);
    // Upper outline
    outline.strokeRoundedRect(-35, -20, 70, 32, 8);
    // Tongue outline
    outline.beginPath();
    outline.moveTo(-12, -20);
    outline.lineTo(-8, -35);
    outline.lineTo(8, -35);
    outline.lineTo(12, -20);
    outline.strokePath();

    this.shoeGroup.add(outline);
    this.shoeOutline = outline;
  },

  // --- Shoe Part Animation ---

  addShoePart: function (partIndex, totalParts) {
    if (!this.shoeGroup) return;
    if (partIndex <= this.lastPartIndex) return;

    // Add all parts from lastPartIndex+1 to partIndex
    for (var i = this.lastPartIndex + 1; i <= partIndex; i++) {
      this._drawPart(i);
    }
    this.lastPartIndex = partIndex;
  },

  _drawPart: function (partIndex) {
    var gfx = this.add.graphics();
    var color = this.currentShoeColor;
    var scene = this;

    switch (partIndex) {
      case 0: // Sole
        gfx.fillStyle(0x5C3D1E, 1);
        gfx.fillRoundedRect(-40, 10, 80, 16, 6);
        // Sole texture
        gfx.fillStyle(0x4a3520, 0.5);
        gfx.fillRect(-30, 14, 60, 2);
        gfx.fillRect(-30, 20, 60, 2);
        // Slide up from below
        gfx.y = 30;
        gfx.alpha = 0;
        this.shoeGroup.add(gfx);
        this.tweens.add({
          targets: gfx,
          y: 0,
          alpha: 1,
          duration: 400,
          ease: 'Back.easeOut',
          onComplete: function () { scene._partBurst(scene.shoeArea.x, scene.shoeArea.y + 18); },
        });
        break;

      case 1: // Upper/body
        gfx.fillStyle(color, 1);
        gfx.fillRoundedRect(-35, -20, 70, 32, 8);
        // Lighter accent
        gfx.fillStyle(0xffffff, 0.15);
        gfx.fillRoundedRect(-30, -16, 60, 12, 4);
        // Rise up from sole
        gfx.y = 20;
        gfx.alpha = 0;
        this.shoeGroup.add(gfx);
        this.tweens.add({
          targets: gfx,
          y: 0,
          alpha: 1,
          duration: 400,
          ease: 'Back.easeOut',
          onComplete: function () { scene._partBurst(scene.shoeArea.x, scene.shoeArea.y - 5); },
        });
        break;

      case 2: // Tongue
        gfx.fillStyle(color, 1);
        gfx.beginPath();
        gfx.moveTo(-12, -20);
        gfx.lineTo(-8, -38);
        gfx.lineTo(8, -38);
        gfx.lineTo(12, -20);
        gfx.closePath();
        gfx.fillPath();
        // Tongue highlight
        gfx.fillStyle(0xffffff, 0.2);
        gfx.beginPath();
        gfx.moveTo(-6, -22);
        gfx.lineTo(-4, -32);
        gfx.lineTo(4, -32);
        gfx.lineTo(6, -22);
        gfx.closePath();
        gfx.fillPath();
        // Fold animation
        gfx.scaleY = 0;
        gfx.alpha = 0;
        this.shoeGroup.add(gfx);
        this.tweens.add({
          targets: gfx,
          scaleY: 1,
          alpha: 1,
          duration: 350,
          ease: 'Back.easeOut',
          onComplete: function () { scene._partBurst(scene.shoeArea.x, scene.shoeArea.y - 30); },
        });
        break;

      case 3: // Laces
        gfx.lineStyle(2, 0xffffff, 0.9);
        // Criss-cross lace pattern
        var laceY = -14;
        for (var l = 0; l < 3; l++) {
          var y = laceY + l * 7;
          gfx.beginPath();
          gfx.moveTo(-14, y);
          gfx.lineTo(14, y + 3);
          gfx.strokePath();
          gfx.beginPath();
          gfx.moveTo(14, y);
          gfx.lineTo(-14, y + 3);
          gfx.strokePath();
        }
        // Lace knot at top
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillCircle(0, laceY - 2, 3);
        // Draw on animation
        gfx.alpha = 0;
        this.shoeGroup.add(gfx);
        this.tweens.add({
          targets: gfx,
          alpha: 1,
          duration: 400,
          ease: 'Power2',
          onComplete: function () { scene._partBurst(scene.shoeArea.x, scene.shoeArea.y - 10); },
        });
        break;

      case 4: // Buckle + polish
        // Buckle
        gfx.fillStyle(0xf1c40f, 1);
        gfx.fillRoundedRect(20, -8, 12, 10, 2);
        gfx.fillStyle(color, 1);
        gfx.fillRoundedRect(23, -5, 6, 4, 1);
        // Shine line across shoe
        gfx.fillStyle(0xffffff, 0.25);
        gfx.fillRect(-30, 4, 60, 3);
        // Pop in
        gfx.scaleX = 0;
        gfx.scaleY = 0;
        gfx.alpha = 0;
        this.shoeGroup.add(gfx);
        this.tweens.add({
          targets: gfx,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          duration: 350,
          ease: 'Back.easeOut',
          onComplete: function () { scene._partBurst(scene.shoeArea.x + 26, scene.shoeArea.y - 3); },
        });
        break;
    }

    // Hide the outline after first part
    if (this.shoeOutline && partIndex === 0) {
      this.tweens.add({
        targets: this.shoeOutline,
        alpha: 0,
        duration: 300,
      });
    }
  },

  _partBurst: function (x, y) {
    var emitter = this.add.particles(x, y, 'cw_sparkle', {
      speed: { min: 20, max: 60 },
      angle: { min: 0, max: 360 },
      lifespan: 400,
      scale: { start: 0.6, end: 0 },
      quantity: 6,
      tint: [0xFFD700, 0xFFF9C4, 0xA67C52],
      emitting: false,
    });
    emitter.setDepth(25);
    emitter.explode();
    this.time.delayedCall(600, function () { emitter.destroy(); });
  },

  // --- Wrong Letter (Shake + Hammer Bonk) ---

  shakeWorkbench: function () {
    if (!this.shoeGroup) return;

    // Shake the shoe
    this.tweens.add({
      targets: this.shoeGroup,
      x: this.shoeArea.x - 6,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Linear',
      onComplete: function () {
        this.shoeGroup.x = this.shoeArea.x;
      }.bind(this),
    });

    // Hammer bonk
    if (this.hammerGroup) {
      this.hammerGroup.alpha = 1;
      this.hammerGroup.angle = -30;
      this.tweens.add({
        targets: this.hammerGroup,
        angle: 10,
        duration: 150,
        ease: 'Power2',
        yoyo: true,
        onComplete: function () {
          this.hammerGroup.alpha = 0;
          this.hammerGroup.angle = 0;
        }.bind(this),
      });
    }

    // Dust burst at workbench
    var dustEmitter = this.add.particles(this.shoeArea.x, this.shoeArea.y + 25, 'cw_dust', {
      speed: { min: 15, max: 40 },
      angle: { min: 220, max: 320 },
      lifespan: 350,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      quantity: 5,
      emitting: false,
    });
    dustEmitter.setDepth(15);
    dustEmitter.explode();
    this.time.delayedCall(500, function () { dustEmitter.destroy(); });
  },

  // --- Complete Shoe to Shelf ---

  completeShoeToShelf: function (shoeIndex, totalShoes, callback) {
    if (!this.shoeGroup) {
      if (callback) callback();
      return;
    }

    var scene = this;
    var slotIdx = Math.min(shoeIndex - 1, this.shelfSlots.length - 1);
    var slot = this.shelfSlots[slotIdx];
    if (!slot) {
      if (callback) callback();
      return;
    }

    // Sparkle burst on shoe
    var sparkEmitter = this.add.particles(this.shoeArea.x, this.shoeArea.y, 'cw_sparkle', {
      speed: { min: 30, max: 80 },
      angle: { min: 0, max: 360 },
      lifespan: 600,
      scale: { start: 0.8, end: 0 },
      quantity: 12,
      tint: [0xFFD700, 0xFFF9C4, 0xFFFFFF],
      emitting: false,
    });
    sparkEmitter.setDepth(30);
    sparkEmitter.explode();

    this.time.delayedCall(800, function () { sparkEmitter.destroy(); });

    // Roll up order scroll
    if (this.orderScroll) {
      this.tweens.add({
        targets: this.orderScroll,
        x: this.scale.width + 60,
        duration: 400,
        ease: 'Power2',
        onComplete: function () {
          if (scene.orderScroll) {
            scene.orderScroll.destroy();
            scene.orderScroll = null;
          }
        },
      });
    }

    // Shrink shoe and float up to shelf
    this.tweens.add({
      targets: this.shoeGroup,
      x: slot.x,
      y: slot.y,
      scaleX: 0.35,
      scaleY: 0.35,
      duration: 800,
      ease: 'Power2',
      delay: 300,
      onComplete: function () {
        // Place a permanent mini shoe on the shelf
        scene._drawShelfShoe(slot.x, slot.y, scene.currentShoeColor);

        // Clean up animated shoe
        if (scene.shoeGroup) {
          scene.shoeGroup.destroy();
          scene.shoeGroup = null;
        }

        scene.shoeIndex++;

        if (callback) callback();
      },
    });
  },

  _drawShelfShoe: function (x, y, color) {
    var shoe = this.add.graphics();
    shoe.setDepth(8);
    // Mini sole
    shoe.fillStyle(0x5C3D1E, 1);
    shoe.fillRoundedRect(x - 12, y + 3, 24, 5, 2);
    // Mini upper
    shoe.fillStyle(color, 1);
    shoe.fillRoundedRect(x - 10, y - 7, 20, 11, 3);
    // Mini buckle
    shoe.fillStyle(0xf1c40f, 1);
    shoe.fillCircle(x + 8, y - 2, 2);

    this.completedShoes.push(shoe);
  },

  // --- Fail Shoe ---

  failShoe: function (callback) {
    if (!this.shoeGroup) {
      if (callback) callback();
      return;
    }

    var scene = this;

    // Shoe parts wobble and fall
    this.tweens.add({
      targets: this.shoeGroup,
      angle: 15,
      y: this.shoeArea.y + 40,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: function () {
        // Dust burst
        var dustEmitter = scene.add.particles(scene.shoeArea.x, scene.shoeArea.y + 30, 'cw_dust', {
          speed: { min: 20, max: 50 },
          angle: { min: 200, max: 340 },
          lifespan: 500,
          scale: { start: 0.6, end: 0 },
          alpha: { start: 0.5, end: 0 },
          quantity: 8,
          emitting: false,
        });
        dustEmitter.setDepth(15);
        dustEmitter.explode();
        scene.time.delayedCall(700, function () { dustEmitter.destroy(); });

        // Clean up
        if (scene.shoeGroup) {
          scene.shoeGroup.destroy();
          scene.shoeGroup = null;
        }

        // Roll up scroll
        if (scene.orderScroll) {
          scene.tweens.add({
            targets: scene.orderScroll,
            x: scene.scale.width + 60,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: function () {
              if (scene.orderScroll) {
                scene.orderScroll.destroy();
                scene.orderScroll = null;
              }
            },
          });
        }

        scene.shoeIndex++;

        if (callback) callback();
      },
    });
  },

  // --- Victory ---

  showVictoryPan: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    // Sparkle all completed shoes
    for (var i = 0; i < this.completedShoes.length; i++) {
      (function (idx) {
        this.time.delayedCall(idx * 150, function () {
          if (idx < this.shelfSlots.length) {
            var slot = this.shelfSlots[idx];
            var sparkEmitter = this.add.particles(slot.x, slot.y, 'cw_sparkle', {
              speed: { min: 15, max: 40 },
              angle: { min: 0, max: 360 },
              lifespan: 500,
              scale: { start: 0.5, end: 0 },
              quantity: 6,
              tint: [0xFFD700, 0xFFF9C4],
              emitting: false,
            });
            sparkEmitter.setDepth(30);
            sparkEmitter.explode();
            this.time.delayedCall(700, function () { sparkEmitter.destroy(); });
          }
        }.bind(this));
      }.bind(this))(i);
    }

    // Camera zoom towards shelf area
    this.cameras.main.zoomTo(1.3, 1500, 'Sine.easeInOut');
    this.cameras.main.pan(w * 0.5, h * 0.25, 1500, 'Sine.easeInOut');
  },

  // --- Elf Character ---

  createElf: function (w, h) {
    // Position elf to the left of the shoe work area
    var elfX = w * 0.18;
    var elfY = this.workbenchY - 10;

    this.elfContainer = this.add.container(elfX, elfY);
    this.elfContainer.setDepth(12);

    // Body (green tunic)
    this.elfBody = this.add.graphics();
    this.elfBody.fillStyle(0x27ae60, 1);
    this.elfBody.fillRoundedRect(-12, -20, 24, 30, 6);
    // Belt
    this.elfBody.fillStyle(0x8B4513, 1);
    this.elfBody.fillRect(-14, -2, 28, 5);
    // Belt buckle
    this.elfBody.fillStyle(0xf1c40f, 1);
    this.elfBody.fillRect(-3, -1, 6, 3);

    // Legs
    var legs = this.add.graphics();
    legs.fillStyle(0x5D4037, 1);
    legs.fillRect(-8, 10, 6, 14);
    legs.fillRect(2, 10, 6, 14);
    // Shoes
    legs.fillStyle(0x2C1810, 1);
    legs.fillRoundedRect(-10, 22, 10, 5, 2);
    legs.fillRoundedRect(0, 22, 10, 5, 2);

    // Head
    this.elfHead = this.add.container(0, -32);

    var head = this.add.graphics();
    // Face
    head.fillStyle(0xFFDBAC, 1);
    head.fillCircle(0, 0, 14);
    // Rosy cheeks
    head.fillStyle(0xFFB6C1, 0.5);
    head.fillCircle(-8, 3, 4);
    head.fillCircle(8, 3, 4);
    // Eyes
    head.fillStyle(0x2C1810, 1);
    head.fillCircle(-5, -2, 2.5);
    head.fillCircle(5, -2, 2.5);
    // Eye highlights
    head.fillStyle(0xFFFFFF, 0.8);
    head.fillCircle(-4, -3, 1);
    head.fillCircle(6, -3, 1);
    // Happy smile
    head.lineStyle(2, 0x2C1810, 1);
    head.beginPath();
    head.arc(0, 2, 5, 0.2, Math.PI - 0.2);
    head.strokePath();

    // Pointed ears
    var ears = this.add.graphics();
    ears.fillStyle(0xFFDBAC, 1);
    // Left ear
    ears.beginPath();
    ears.moveTo(-14, -2);
    ears.lineTo(-22, -8);
    ears.lineTo(-14, 2);
    ears.closePath();
    ears.fillPath();
    // Right ear
    ears.beginPath();
    ears.moveTo(14, -2);
    ears.lineTo(22, -8);
    ears.lineTo(14, 2);
    ears.closePath();
    ears.fillPath();

    // Hat (tall pointed green)
    var hat = this.add.graphics();
    hat.fillStyle(0x1e8449, 1);
    hat.beginPath();
    hat.moveTo(-14, -10);
    hat.lineTo(0, -42);
    hat.lineTo(14, -10);
    hat.closePath();
    hat.fillPath();
    // Hat band
    hat.fillStyle(0xf1c40f, 1);
    hat.fillRect(-15, -12, 30, 4);
    // Hat pom-pom
    hat.fillStyle(0xe74c3c, 1);
    hat.fillCircle(2, -40, 5);

    this.elfHead.add([ears, head, hat]);

    // Arm (for hammer animation) - starts at rest
    this.elfArm = this.add.container(10, -8);
    var armGfx = this.add.graphics();
    armGfx.fillStyle(0x27ae60, 1);
    armGfx.fillRect(0, -4, 18, 8); // Upper arm
    armGfx.fillStyle(0xFFDBAC, 1);
    armGfx.fillCircle(20, 0, 5); // Hand
    // Mini hammer in hand
    armGfx.fillStyle(0x8B6914, 1);
    armGfx.fillRect(18, -12, 4, 16); // Handle
    armGfx.fillStyle(0x636e72, 1);
    armGfx.fillRect(14, -16, 12, 8); // Head
    this.elfArm.add(armGfx);
    this.elfArm.setRotation(-0.3); // Resting position

    this.elfContainer.add([legs, this.elfBody, this.elfArm, this.elfHead]);

    // Start idle animation
    this.elfIdle();
  },

  elfIdle: function () {
    if (!this.elfContainer) return;

    // Stop any existing idle tween
    if (this.elfIdleTween) {
      this.elfIdleTween.stop();
    }

    // Subtle breathing animation
    this.elfIdleTween = this.tweens.add({
      targets: this.elfBody,
      scaleY: 0.97,
      scaleX: 1.02,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Occasional blink
    this.time.addEvent({
      delay: 2500 + Math.random() * 2000,
      callback: this.elfBlink,
      callbackScope: this,
      loop: true,
    });
  },

  elfBlink: function () {
    if (!this.elfHead) return;
    // Quick scale squash of head for blink effect
    this.tweens.add({
      targets: this.elfHead,
      scaleY: 0.9,
      duration: 80,
      yoyo: true,
      ease: 'Power1',
    });
  },

  elfTapHammer: function () {
    if (!this.elfArm || !this.elfContainer) return;

    // Swing arm down (hammer tap)
    this.tweens.add({
      targets: this.elfArm,
      rotation: 0.5,
      duration: 100,
      yoyo: true,
      ease: 'Power2',
    });

    // Happy bounce
    this.tweens.add({
      targets: this.elfContainer,
      y: this.elfContainer.y - 4,
      duration: 100,
      yoyo: true,
      ease: 'Power2',
    });
  },

  elfVictoryDance: function () {
    if (!this.elfContainer) return;
    var scene = this;

    // Jump up with arms up (rotate arm up)
    this.tweens.add({
      targets: this.elfArm,
      rotation: -1.2,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Jump sequence
    this.tweens.add({
      targets: this.elfContainer,
      y: this.elfContainer.y - 20,
      duration: 250,
      yoyo: true,
      repeat: 2,
      ease: 'Power2',
      onComplete: function () {
        // Return arm to rest
        scene.tweens.add({
          targets: scene.elfArm,
          rotation: -0.3,
          duration: 300,
          ease: 'Power2',
        });
      },
    });

    // Sparkles around elf
    var elfX = this.elfContainer.x;
    var elfY = this.elfContainer.y - 20;
    var sparkEmitter = this.add.particles(elfX, elfY, 'cw_sparkle', {
      speed: { min: 30, max: 70 },
      angle: { min: 0, max: 360 },
      lifespan: 600,
      scale: { start: 0.6, end: 0 },
      quantity: 10,
      tint: [0xFFD700, 0xFFF9C4, 0x27ae60],
      emitting: false,
    });
    sparkEmitter.setDepth(30);
    sparkEmitter.explode();
    this.time.delayedCall(800, function () { sparkEmitter.destroy(); });
  },

  elfScratchHead: function () {
    if (!this.elfArm || !this.elfHead) return;
    var scene = this;

    // Move arm up to head
    this.tweens.add({
      targets: this.elfArm,
      rotation: -1.5,
      x: 5,
      y: -25,
      duration: 200,
      yoyo: true,
      hold: 400,
      ease: 'Power2',
      onComplete: function () {
        scene.elfArm.x = 10;
        scene.elfArm.y = -8;
      },
    });

    // Tilt head confused
    this.tweens.add({
      targets: this.elfHead,
      rotation: 0.2,
      duration: 150,
      yoyo: true,
      hold: 400,
      ease: 'Power2',
    });
  },

  elfSad: function () {
    if (!this.elfContainer || !this.elfBody) return;

    // Slump down
    this.tweens.add({
      targets: this.elfContainer,
      y: this.elfContainer.y + 8,
      duration: 400,
      ease: 'Power2',
    });

    // Arm drops
    this.tweens.add({
      targets: this.elfArm,
      rotation: 0.6,
      duration: 400,
      ease: 'Power2',
    });

    // Head droops
    this.tweens.add({
      targets: this.elfHead,
      y: this.elfHead.y + 5,
      rotation: -0.1,
      duration: 400,
      ease: 'Power2',
    });
  },

  elfReset: function () {
    if (!this.elfContainer) return;
    var w = this.scale.width;
    var elfX = w * 0.18;
    var elfY = this.workbenchY - 10;

    // Reset elf position and pose
    this.elfContainer.x = elfX;
    this.elfContainer.y = elfY;
    if (this.elfArm) {
      this.elfArm.rotation = -0.3;
      this.elfArm.x = 10;
      this.elfArm.y = -8;
    }
    if (this.elfHead) {
      this.elfHead.y = -32;
      this.elfHead.rotation = 0;
    }
  },

  // --- Customer Window ---

  createWindow: function (w, h) {
    // Window position: left side of wall, in visible area (wall is 0-55% of height)
    var winW = 50;
    var winH = 42;
    var winX = winW / 2 + 12; // 12px margin from left edge
    var winY = h * 0.32; // In the middle of the wall area

    this.windowGroup = this.add.container(winX, winY);
    this.windowGroup.setDepth(8);

    var gfx = this.add.graphics();

    // Window hole (dark background)
    gfx.fillStyle(0x1a1a2e, 1);
    gfx.fillRect(-winW / 2, -winH / 2, winW, winH);

    // Wooden frame
    gfx.fillStyle(0x5C3D1E, 1);
    // Top
    gfx.fillRect(-winW / 2 - 4, -winH / 2 - 4, winW + 8, 6);
    // Bottom
    gfx.fillRect(-winW / 2 - 4, winH / 2 - 2, winW + 8, 6);
    // Left
    gfx.fillRect(-winW / 2 - 4, -winH / 2, 6, winH);
    // Right
    gfx.fillRect(winW / 2 - 2, -winH / 2, 6, winH);

    // Cross bars (4 panes)
    gfx.fillStyle(0x5C3D1E, 1);
    gfx.fillRect(-2, -winH / 2, 4, winH); // Vertical
    gfx.fillRect(-winW / 2, -2, winW, 4); // Horizontal

    this.windowGroup.add(gfx);

    // Customer container (will hold customer graphics)
    this.customerContainer = this.add.container(0, 10);
    this.customerContainer.setDepth(5);
    this.windowGroup.add(this.customerContainer);
  },

  showNewCustomer: function () {
    if (!this.customerContainer) return;
    var scene = this;

    // Clear previous customer
    this.customerContainer.removeAll(true);

    // Pick random customer from pool
    var idx = Math.floor(Math.random() * this.customerPool.length);
    this.currentCustomer = this.customerPool[idx];

    // Create customer graphics
    var cust = this.add.graphics();

    // Head
    cust.fillStyle(this.currentCustomer.skin, 1);
    cust.fillCircle(0, -8, 16);

    // Hair (different styles for boy/girl)
    cust.fillStyle(this.currentCustomer.hair, 1);
    if (this.currentCustomer.type === 'girl') {
      // Girl: longer hair sides
      cust.fillCircle(0, -16, 12);
      cust.fillRect(-14, -18, 6, 20);
      cust.fillRect(8, -18, 6, 20);
    } else {
      // Boy: short hair top
      cust.fillCircle(0, -18, 10);
      cust.fillRect(-10, -22, 20, 8);
    }

    // Eyes
    cust.fillStyle(0x2C1810, 1);
    cust.fillCircle(-5, -10, 2);
    cust.fillCircle(5, -10, 2);

    // Smile
    cust.lineStyle(2, 0x2C1810, 1);
    cust.beginPath();
    cust.arc(0, -4, 4, 0.3, Math.PI - 0.3);
    cust.strokePath();

    // Shoulders
    cust.fillStyle(this.currentCustomer.type === 'girl' ? 0xe84393 : 0x3498db, 1);
    cust.fillRoundedRect(-18, 8, 36, 20, 4);

    this.customerContainer.add(cust);

    // Animate peek-in from below
    this.customerContainer.y = 45;
    this.customerContainer.alpha = 0;

    this.tweens.add({
      targets: this.customerContainer,
      y: 10,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Wave animation (quick scale pulse)
    this.time.delayedCall(400, function () {
      scene.tweens.add({
        targets: scene.customerContainer,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        yoyo: true,
        ease: 'Power2',
      });
    });
  },

  customerReact: function (type) {
    if (!this.customerContainer) return;

    if (type === 'happy') {
      // Nod (quick y bounce)
      this.tweens.add({
        targets: this.customerContainer,
        y: this.customerContainer.y - 3,
        duration: 100,
        yoyo: true,
        ease: 'Power2',
      });
    } else if (type === 'worried') {
      // Slight shake
      this.tweens.add({
        targets: this.customerContainer,
        x: this.customerContainer.x - 3,
        duration: 60,
        yoyo: true,
        repeat: 2,
        ease: 'Linear',
        onComplete: function () {
          this.customerContainer.x = 0;
        }.bind(this),
      });
    }
  },

  customerExit: function (happy) {
    if (!this.customerContainer) return;
    var scene = this;

    if (happy) {
      // Excited bounce then exit up
      this.tweens.add({
        targets: this.customerContainer,
        y: this.customerContainer.y - 8,
        duration: 150,
        yoyo: true,
        repeat: 2,
        ease: 'Power2',
        onComplete: function () {
          scene.tweens.add({
            targets: scene.customerContainer,
            y: -50,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
          });
        },
      });
    } else {
      // Sad sink down
      this.tweens.add({
        targets: this.customerContainer,
        y: 50,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
      });
    }
  },

  // --- Silly Reactions ---

  playSillyReaction: function () {
    // Pick a random reaction (avoid repeating last one)
    var idx;
    do {
      idx = Math.floor(Math.random() * this.sillyReactions.length);
    } while (idx === this.lastSillyIndex && this.sillyReactions.length > 1);
    this.lastSillyIndex = idx;

    var reaction = this.sillyReactions[idx];
    switch (reaction) {
      case 'googlyEyes':
        this.sillyGooglyEyes();
        break;
      case 'fire':
        this.sillyFire();
        break;
      case 'waterSquirt':
        this.sillyWaterSquirt();
        break;
      case 'wiggle':
        this.sillyWiggle();
        break;
    }
  },

  sillyGooglyEyes: function () {
    if (!this.shoeGroup) return;
    var scene = this;

    // Create googly eyes on the shoe
    var eyes = this.add.container(this.shoeArea.x, this.shoeArea.y - 5);
    eyes.setDepth(20);

    var leftEye = this.add.graphics();
    leftEye.fillStyle(0xFFFFFF, 1);
    leftEye.fillCircle(-15, 0, 10);
    leftEye.fillStyle(0x000000, 1);
    leftEye.fillCircle(-15, 0, 5);

    var rightEye = this.add.graphics();
    rightEye.fillStyle(0xFFFFFF, 1);
    rightEye.fillCircle(15, 0, 10);
    rightEye.fillStyle(0x000000, 1);
    rightEye.fillCircle(15, 0, 5);

    eyes.add([leftEye, rightEye]);

    // Pop in
    eyes.scaleX = 0;
    eyes.scaleY = 0;
    this.tweens.add({
      targets: eyes,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });

    // Pupils look around randomly
    var pupilTween = this.tweens.add({
      targets: [leftEye, rightEye],
      x: { from: -3, to: 3 },
      y: { from: -2, to: 2 },
      duration: 100,
      yoyo: true,
      repeat: 3,
      ease: 'Power1',
    });

    // Shrink and remove
    this.time.delayedCall(500, function () {
      scene.tweens.add({
        targets: eyes,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 150,
        ease: 'Power2',
        onComplete: function () { eyes.destroy(); },
      });
    });
  },

  sillyFire: function () {
    if (!this.shoeGroup) return;
    var scene = this;

    // Create fire particle texture if not exists
    if (!this.textures.exists('cw_fire')) {
      var fireGfx = this.make.graphics({ x: 0, y: 0, add: false });
      fireGfx.fillStyle(0xFF6B35, 1);
      fireGfx.fillCircle(4, 4, 4);
      fireGfx.generateTexture('cw_fire', 8, 8);
      fireGfx.destroy();
    }

    // Fire particles
    var fireEmitter = this.add.particles(this.shoeArea.x, this.shoeArea.y - 10, 'cw_fire', {
      speed: { min: 30, max: 60 },
      angle: { min: 250, max: 290 },
      lifespan: 400,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xFF6B35, 0xFFD93D, 0xFF4500],
      quantity: 8,
      frequency: 50,
    });
    fireEmitter.setDepth(25);

    // Stop after a moment, then puff
    this.time.delayedCall(350, function () {
      fireEmitter.stop();

      // Smoke puff
      var smokeEmitter = scene.add.particles(scene.shoeArea.x, scene.shoeArea.y - 10, 'cw_dust', {
        speed: { min: 20, max: 50 },
        angle: { min: 240, max: 300 },
        lifespan: 400,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.6, end: 0 },
        tint: 0x666666,
        quantity: 6,
        emitting: false,
      });
      smokeEmitter.setDepth(25);
      smokeEmitter.explode();

      scene.time.delayedCall(500, function () {
        fireEmitter.destroy();
        smokeEmitter.destroy();
      });
    });
  },

  sillyWaterSquirt: function () {
    if (!this.shoeGroup) return;
    var scene = this;

    // Create water particle texture if not exists
    if (!this.textures.exists('cw_water')) {
      var waterGfx = this.make.graphics({ x: 0, y: 0, add: false });
      waterGfx.fillStyle(0x74b9ff, 1);
      waterGfx.fillCircle(3, 3, 3);
      waterGfx.generateTexture('cw_water', 6, 6);
      waterGfx.destroy();
    }

    // Water spray particles
    var waterEmitter = this.add.particles(this.shoeArea.x, this.shoeArea.y, 'cw_water', {
      speed: { min: 60, max: 100 },
      angle: { min: 200, max: 340 },
      lifespan: 500,
      scale: { start: 0.6, end: 0.2 },
      alpha: { start: 0.8, end: 0 },
      gravityY: 150,
      tint: [0x74b9ff, 0x0984e3, 0x81ecec],
      quantity: 12,
      emitting: false,
    });
    waterEmitter.setDepth(25);
    waterEmitter.explode();

    this.time.delayedCall(600, function () {
      waterEmitter.destroy();
    });
  },

  sillyWiggle: function () {
    if (!this.shoeGroup) return;
    var scene = this;

    // Shoe wiggles side to side like trying to escape
    this.tweens.add({
      targets: this.shoeGroup,
      rotation: 0.15,
      duration: 60,
      yoyo: true,
      repeat: 5,
      ease: 'Sine.easeInOut',
      onComplete: function () {
        scene.shoeGroup.rotation = 0;
      },
    });

    // Also wobble up and down
    this.tweens.add({
      targets: this.shoeGroup,
      y: this.shoeArea.y - 5,
      duration: 80,
      yoyo: true,
      repeat: 3,
      ease: 'Power1',
      onComplete: function () {
        scene.shoeGroup.y = scene.shoeArea.y;
      },
    });
  },

  // --- Cleanup ---

  shutdown: function () {
    this.shelfSlots = [];
    this.completedShoes = [];
    if (this.shoeGroup) {
      this.shoeGroup.destroy();
      this.shoeGroup = null;
    }
    if (this.orderScroll) {
      this.orderScroll.destroy();
      this.orderScroll = null;
    }
    if (this.elfContainer) {
      this.elfContainer.destroy();
      this.elfContainer = null;
    }
    if (this.windowGroup) {
      this.windowGroup.destroy();
      this.windowGroup = null;
    }
    if (this.elfIdleTween) {
      this.elfIdleTween.stop();
      this.elfIdleTween = null;
    }
  },
});
