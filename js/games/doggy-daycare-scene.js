/**
 * Doggy Daycare Scene - Phaser 3 Scene with all game visuals.
 * Yard background with fence, dogs doing potty dance, Ava as daycare worker.
 *
 * All art is drawn with Phaser Graphics API (zero external assets).
 */

var DoggyDaycareScene = new Phaser.Class({

  Extends: Phaser.Scene,

  initialize: function DoggyDaycareScene() {
    Phaser.Scene.call(this, { key: 'DoggyDaycareScene' });

    // Scene objects
    this.timerBar = null;
    this.timerBarBg = null;
    this.dogGroup = null;
    this.avaGroup = null;
    this.speechBubble = null;
    this.groundY = 0;

    // Dog state
    this.currentDog = null;
    this.dogIndex = 0;
    this.pottyDanceTween = null;
    this.urgencyLevel = 0;

    // Dog breeds
    this.breeds = [
      { name: 'corgi', bodyColor: 0xFF6B35, accentColor: 0xFFFFFF, earType: 'pointy', bodyShape: 'short' },
      { name: 'poodle', bodyColor: 0xFFFFFF, accentColor: 0xFFB6C1, earType: 'fluffy', bodyShape: 'fluffy' },
      { name: 'husky', bodyColor: 0x78909C, accentColor: 0xFFFFFF, earType: 'pointy', bodyShape: 'athletic' },
      { name: 'dachshund', bodyColor: 0x8B4513, accentColor: 0xD2691E, earType: 'floppy', bodyShape: 'long' },
      { name: 'golden', bodyColor: 0xDAA520, accentColor: 0xFFD700, earType: 'floppy', bodyShape: 'medium' },
      { name: 'dalmatian', bodyColor: 0xFFFFFF, accentColor: 0x000000, earType: 'floppy', bodyShape: 'medium' },
    ];

    // Easter egg state
    this.easterEggActive = false;

    // Track helped dogs for victory parade
    this.helpedBreeds = [];
  },

  create: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    // Yard background
    this.drawBackground(w, h);

    // Fence
    this.drawFence(w, h);

    // Decorations (dog houses, toys, etc.)
    this.drawDecorations(w, h);

    // Timer bar
    this.createTimerBar(w);

    // Create particle textures
    this.createParticleTextures();

    // Ava (daycare worker)
    this.createAva(w, h);

    // Start Easter egg scheduler
    this.startEasterEggs();

    // Notify DoggyDaycare that scene is ready
    if (typeof DoggyDaycare !== 'undefined' && DoggyDaycare._pendingInit) {
      DoggyDaycare._pendingInit(this);
      DoggyDaycare._pendingInit = null;
    }
  },

  update: function (time, delta) {
    // Nothing continuous for now
  },

  // --- Background ---

  drawBackground: function (w, h) {
    var gfx = this.add.graphics();

    // Sky gradient
    var steps = 10;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      // Light blue sky
      var r = Math.round(135 + t * 30);
      var g = Math.round(206 + t * 20);
      var b = Math.round(250 - t * 10);
      var color = (r << 16) | (g << 8) | b;
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, (h * 0.5 * i) / steps, w, h * 0.5 / steps + 1);
    }

    // Ground (grass)
    this.groundY = h * 0.65;
    gfx.fillStyle(0x7CB342, 1);
    gfx.fillRect(0, this.groundY, w, h - this.groundY);

    // Darker grass line at edge
    gfx.fillStyle(0x689F38, 1);
    gfx.fillRect(0, this.groundY, w, 4);

    // Grass texture (lighter patches)
    gfx.fillStyle(0x8BC34A, 0.5);
    for (var x = 0; x < w; x += 50) {
      for (var y = this.groundY + 10; y < h; y += 40) {
        var patchX = x + Math.sin(y * 0.1) * 15;
        gfx.fillEllipse(patchX, y, 20 + Math.random() * 10, 8);
      }
    }

    // Paw print pattern on ground
    this.drawPawPrints(w, h);
  },

  drawPawPrints: function (w, h) {
    var gfx = this.add.graphics();
    gfx.fillStyle(0x558B2F, 0.3);

    for (var i = 0; i < 8; i++) {
      var px = 30 + Math.random() * (w - 60);
      var py = this.groundY + 20 + Math.random() * (h - this.groundY - 40);

      // Main pad
      gfx.fillEllipse(px, py, 8, 6);
      // Toe beans
      gfx.fillCircle(px - 5, py - 6, 3);
      gfx.fillCircle(px + 5, py - 6, 3);
      gfx.fillCircle(px - 7, py - 2, 2.5);
      gfx.fillCircle(px + 7, py - 2, 2.5);
    }
  },

  drawFence: function (w, h) {
    var gfx = this.add.graphics();
    var fenceY = h * 0.35;
    var fenceH = this.groundY - fenceY + 10;

    // Fence posts
    var postCount = Math.ceil(w / 50);
    for (var i = 0; i < postCount; i++) {
      var px = i * 50 + 25;

      // Post
      gfx.fillStyle(0x8D6E63, 1);
      gfx.fillRect(px - 4, fenceY, 8, fenceH);

      // Post top (pointed)
      gfx.beginPath();
      gfx.moveTo(px - 6, fenceY);
      gfx.lineTo(px, fenceY - 12);
      gfx.lineTo(px + 6, fenceY);
      gfx.closePath();
      gfx.fillPath();

      // Picket between posts
      if (i < postCount - 1) {
        for (var j = 1; j <= 2; j++) {
          var picketX = px + j * 16;
          gfx.fillStyle(0xA1887F, 1);
          gfx.fillRect(picketX - 3, fenceY + 5, 6, fenceH - 15);

          // Picket top
          gfx.beginPath();
          gfx.moveTo(picketX - 4, fenceY + 5);
          gfx.lineTo(picketX, fenceY - 5);
          gfx.lineTo(picketX + 4, fenceY + 5);
          gfx.closePath();
          gfx.fillPath();
        }
      }
    }

    // Horizontal rails
    gfx.fillStyle(0x6D4C41, 1);
    gfx.fillRect(0, fenceY + 15, w, 6);
    gfx.fillRect(0, this.groundY - 20, w, 6);
  },

  drawDecorations: function (w, h) {
    var gfx = this.add.graphics();

    // Dog house (left side)
    this.drawDogHouse(gfx, w * 0.12, this.groundY - 10);

    // Dog house (right side, smaller/distant)
    this.drawDogHouse(gfx, w * 0.85, this.groundY - 5, 0.7);

    // Tennis ball
    gfx.fillStyle(0xCDDC39, 1);
    gfx.fillCircle(w * 0.3, this.groundY + 15, 8);
    gfx.lineStyle(2, 0xAFB42B, 1);
    gfx.beginPath();
    gfx.arc(w * 0.3, this.groundY + 15, 8, 0.5, 2.5);
    gfx.strokePath();

    // Bone toy
    gfx.fillStyle(0xFFF8E1, 1);
    gfx.fillRoundedRect(w * 0.7, this.groundY + 12, 25, 8, 4);
    gfx.fillCircle(w * 0.7, this.groundY + 16, 6);
    gfx.fillCircle(w * 0.7 + 25, this.groundY + 16, 6);

    // Water bowl
    gfx.fillStyle(0x1565C0, 1);
    gfx.fillEllipse(w * 0.55, this.groundY + 18, 18, 8);
    gfx.fillStyle(0x64B5F6, 0.7);
    gfx.fillEllipse(w * 0.55, this.groundY + 16, 14, 5);

    // Rope toy
    gfx.lineStyle(6, 0xD84315, 1);
    gfx.beginPath();
    gfx.moveTo(w * 0.4, this.groundY + 20);
    gfx.lineTo(w * 0.45, this.groundY + 25);
    gfx.strokePath();
    gfx.fillStyle(0xBF360C, 1);
    gfx.fillCircle(w * 0.4, this.groundY + 20, 5);
    gfx.fillCircle(w * 0.45, this.groundY + 25, 5);

    // Bush (left)
    gfx.fillStyle(0x388E3C, 1);
    gfx.fillCircle(w * 0.05, this.groundY + 5, 20);
    gfx.fillCircle(w * 0.02, this.groundY, 15);
    gfx.fillStyle(0x4CAF50, 1);
    gfx.fillCircle(w * 0.06, this.groundY - 5, 12);

    // Bush (right)
    gfx.fillStyle(0x388E3C, 1);
    gfx.fillCircle(w * 0.95, this.groundY + 5, 18);
    gfx.fillStyle(0x4CAF50, 1);
    gfx.fillCircle(w * 0.97, this.groundY, 12);
  },

  drawDogHouse: function (gfx, x, y, scale) {
    scale = scale || 1;
    var s = scale;

    // House body
    gfx.fillStyle(0xD84315, 1);
    gfx.fillRect(x - 25 * s, y - 30 * s, 50 * s, 40 * s);

    // Roof
    gfx.fillStyle(0x5D4037, 1);
    gfx.beginPath();
    gfx.moveTo(x - 32 * s, y - 30 * s);
    gfx.lineTo(x, y - 55 * s);
    gfx.lineTo(x + 32 * s, y - 30 * s);
    gfx.closePath();
    gfx.fillPath();

    // Door opening
    gfx.fillStyle(0x3E2723, 1);
    gfx.fillRoundedRect(x - 12 * s, y - 20 * s, 24 * s, 30 * s, { tl: 12 * s, tr: 12 * s, bl: 0, br: 0 });

    // Name plate
    gfx.fillStyle(0xFFEB3B, 1);
    gfx.fillRoundedRect(x - 10 * s, y - 48 * s, 20 * s, 8 * s, 2);
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

    // Update potty dance intensity based on timer
    this.updatePottyDanceIntensity(ratio);
  },

  // --- Particle Textures ---

  createParticleTextures: function () {
    // Heart particle
    var heartGfx = this.make.graphics({ x: 0, y: 0, add: false });
    heartGfx.fillStyle(0xFF6B6B, 1);
    heartGfx.fillCircle(4, 5, 4);
    heartGfx.fillCircle(8, 5, 4);
    heartGfx.beginPath();
    heartGfx.moveTo(0, 6);
    heartGfx.lineTo(6, 14);
    heartGfx.lineTo(12, 6);
    heartGfx.closePath();
    heartGfx.fillPath();
    heartGfx.generateTexture('dd_heart', 12, 14);
    heartGfx.destroy();

    // Sparkle particle
    var sparkGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sparkGfx.fillStyle(0xFFD700, 1);
    sparkGfx.fillCircle(4, 4, 4);
    sparkGfx.generateTexture('dd_sparkle', 8, 8);
    sparkGfx.destroy();

    // Poop splat particle
    var splatGfx = this.make.graphics({ x: 0, y: 0, add: false });
    splatGfx.fillStyle(0x795548, 1);
    splatGfx.fillCircle(4, 4, 4);
    splatGfx.generateTexture('dd_splat', 8, 8);
    splatGfx.destroy();

    // Stink cloud particle (green)
    var stinkGfx = this.make.graphics({ x: 0, y: 0, add: false });
    stinkGfx.fillStyle(0x8BC34A, 1);
    stinkGfx.fillCircle(5, 5, 5);
    stinkGfx.generateTexture('dd_stink', 10, 10);
    stinkGfx.destroy();
  },

  // --- Ava (Daycare Worker) ---

  createAva: function (w, h) {
    var avaX = w * 0.78;
    var avaY = this.groundY - 50;

    this.avaGroup = this.add.container(avaX, avaY);
    this.avaGroup.setDepth(20);
    this.avaGroup.setScale(2.2);

    var gfx = this.add.graphics();

    // Skin color for Black Ava
    var skinColor = 0x8B4513;

    // Body (green daycare apron)
    gfx.fillStyle(0x4CAF50, 1);
    gfx.beginPath();
    gfx.moveTo(-15, 0);
    gfx.lineTo(-20, 40);
    gfx.lineTo(20, 40);
    gfx.lineTo(15, 0);
    gfx.closePath();
    gfx.fillPath();

    // Apron pocket
    gfx.fillStyle(0x388E3C, 1);
    gfx.fillRoundedRect(-10, 15, 20, 15, 3);

    // Treat bag in pocket
    gfx.fillStyle(0xFFEB3B, 1);
    gfx.fillRoundedRect(-6, 12, 12, 10, 2);
    gfx.fillStyle(0xFBC02D, 1);
    gfx.fillRect(-6, 12, 12, 3);

    // Shirt under apron
    gfx.fillStyle(0x81D4FA, 1);
    gfx.fillRect(-12, -5, 24, 10);

    // Head
    gfx.fillStyle(skinColor, 1);
    gfx.fillCircle(0, -22, 16);

    // Hair (curly puffs - like Ava!)
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillEllipse(0, -34, 22, 14);
    gfx.fillCircle(-12, -30, 10);
    gfx.fillCircle(12, -30, 10);
    // Puff balls on sides
    gfx.fillCircle(-18, -22, 8);
    gfx.fillCircle(18, -22, 8);

    // Hair ties (colorful beads)
    gfx.fillStyle(0xE91E63, 1);
    gfx.fillCircle(-16, -28, 3);
    gfx.fillCircle(16, -28, 3);
    gfx.fillStyle(0xFFC107, 1);
    gfx.fillCircle(-18, -18, 2);
    gfx.fillCircle(18, -18, 2);

    // Eyes
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillCircle(-5, -24, 3);
    gfx.fillCircle(5, -24, 3);

    // Eye shine
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(-4, -25, 1);
    gfx.fillCircle(6, -25, 1);

    // Smile
    gfx.lineStyle(2, 0x3e2723, 1);
    gfx.beginPath();
    gfx.arc(0, -18, 6, 0.2, Math.PI - 0.2);
    gfx.strokePath();

    // Arms
    gfx.fillStyle(skinColor, 1);
    // Left arm (holding treat)
    gfx.fillEllipse(-22, 10, 8, 14);
    // Right arm (waving)
    gfx.fillEllipse(25, 0, 8, 14);

    // Hands
    gfx.fillCircle(-22, 20, 6);
    gfx.fillCircle(30, -5, 6);

    // Treat in hand
    gfx.fillStyle(0x8D6E63, 1);
    gfx.fillCircle(-22, 26, 5);
    gfx.fillStyle(0xA1887F, 1);
    gfx.fillCircle(-22, 26, 3);

    this.avaGroup.add(gfx);

    // Idle wave animation
    this.tweens.add({
      targets: this.avaGroup,
      angle: 2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  },

  // --- Dog ---

  showNewDog: function (itemData) {
    var w = this.scale.width;
    var scene = this;

    // Remove old dog
    if (this.dogGroup) {
      this.dogGroup.destroy();
      this.dogGroup = null;
    }
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
    if (this.pottyDanceTween) {
      this.pottyDanceTween.stop();
      this.pottyDanceTween = null;
    }

    // Pick breed
    var breed = this.breeds[this.dogIndex % this.breeds.length];
    this.currentDog = breed;

    // Create dog at left side, will walk in
    var startX = -80;
    var endX = w * 0.32;
    var dogY = this.groundY - 30;

    this.dogGroup = this.add.container(startX, dogY);
    this.dogGroup.setDepth(15);
    this.dogGroup.setScale(2.5);

    // Draw dog based on breed
    this.drawDog(breed);

    // Reset urgency
    this.urgencyLevel = 0;

    // Walk in animation
    this.tweens.add({
      targets: this.dogGroup,
      x: endX,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: function () {
        // Show speech bubble with item
        scene.showSpeechBubble(itemData);
        // Start potty dance
        scene.startPottyDance();
      },
    });

    this.dogIndex++;
  },

  drawDog: function (breed) {
    var gfx = this.add.graphics();

    switch (breed.bodyShape) {
      case 'short': // Corgi
        this.drawCorgi(gfx, breed);
        break;
      case 'fluffy': // Poodle
        this.drawPoodle(gfx, breed);
        break;
      case 'athletic': // Husky
        this.drawHusky(gfx, breed);
        break;
      case 'long': // Dachshund
        this.drawDachshund(gfx, breed);
        break;
      case 'medium': // Golden/Dalmatian
        if (breed.name === 'dalmatian') {
          this.drawDalmatian(gfx, breed);
        } else {
          this.drawGolden(gfx, breed);
        }
        break;
    }

    this.dogGroup.add(gfx);
  },

  drawCorgi: function (gfx, breed) {
    // Short & wide body
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillEllipse(0, 0, 30, 14);

    // White chest
    gfx.fillStyle(breed.accentColor, 1);
    gfx.fillEllipse(12, 2, 10, 8);

    // Head
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillCircle(20, -8, 12);

    // White muzzle
    gfx.fillStyle(breed.accentColor, 1);
    gfx.fillEllipse(26, -4, 8, 6);

    // Pointy ears
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.beginPath();
    gfx.moveTo(14, -16);
    gfx.lineTo(10, -28);
    gfx.lineTo(18, -18);
    gfx.closePath();
    gfx.fillPath();
    gfx.beginPath();
    gfx.moveTo(22, -18);
    gfx.lineTo(28, -28);
    gfx.lineTo(26, -16);
    gfx.closePath();
    gfx.fillPath();

    // Eyes
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(17, -10, 2);
    gfx.fillCircle(23, -10, 2);

    // Nose
    gfx.fillCircle(30, -6, 3);

    // Legs (short stubby)
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillRect(-18, 8, 6, 12);
    gfx.fillRect(-8, 8, 6, 12);
    gfx.fillRect(8, 8, 6, 12);
    gfx.fillRect(18, 8, 6, 12);

    // Tail (fluffy stub)
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillCircle(-25, -2, 6);
  },

  drawPoodle: function (gfx, breed) {
    // Fluffy body
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillCircle(0, 0, 16);
    gfx.fillCircle(-8, 2, 10);
    gfx.fillCircle(8, 2, 10);

    // Head (fluffy pompom)
    gfx.fillCircle(18, -10, 14);
    gfx.fillCircle(22, -5, 10);

    // Fluffy ears
    gfx.fillCircle(8, -8, 10);
    gfx.fillCircle(24, -18, 8);

    // Pink bow
    gfx.fillStyle(breed.accentColor, 1);
    gfx.beginPath();
    gfx.moveTo(14, -22);
    gfx.lineTo(8, -28);
    gfx.lineTo(14, -25);
    gfx.lineTo(20, -28);
    gfx.closePath();
    gfx.fillPath();
    gfx.fillCircle(14, -23, 3);

    // Eyes
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(16, -12, 2);
    gfx.fillCircle(22, -12, 2);

    // Nose
    gfx.fillCircle(28, -8, 3);

    // Legs (poofy)
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillCircle(-12, 16, 6);
    gfx.fillCircle(-4, 16, 6);
    gfx.fillCircle(4, 16, 6);
    gfx.fillCircle(12, 16, 6);

    // Pompom tail
    gfx.fillCircle(-20, -5, 8);
  },

  drawHusky: function (gfx, breed) {
    // Athletic body
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillEllipse(0, 0, 28, 16);

    // White underbelly
    gfx.fillStyle(breed.accentColor, 1);
    gfx.fillEllipse(0, 6, 22, 8);

    // Head
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillCircle(22, -6, 14);

    // White face mask
    gfx.fillStyle(breed.accentColor, 1);
    gfx.beginPath();
    gfx.moveTo(22, -18);
    gfx.lineTo(16, -2);
    gfx.lineTo(22, 4);
    gfx.lineTo(28, -2);
    gfx.closePath();
    gfx.fillPath();

    // Pointy ears
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.beginPath();
    gfx.moveTo(14, -14);
    gfx.lineTo(12, -28);
    gfx.lineTo(20, -16);
    gfx.closePath();
    gfx.fillPath();
    gfx.beginPath();
    gfx.moveTo(26, -16);
    gfx.lineTo(32, -28);
    gfx.lineTo(30, -14);
    gfx.closePath();
    gfx.fillPath();

    // Blue eyes (husky special!)
    gfx.fillStyle(0x03A9F4, 1);
    gfx.fillCircle(18, -8, 3);
    gfx.fillCircle(26, -8, 3);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(18, -8, 1.5);
    gfx.fillCircle(26, -8, 1.5);

    // Nose
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(32, -2, 3);

    // Legs
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillRect(-18, 10, 7, 14);
    gfx.fillRect(-6, 10, 7, 14);
    gfx.fillRect(6, 10, 7, 14);
    gfx.fillRect(18, 10, 7, 14);

    // Fluffy curved tail
    gfx.lineStyle(8, breed.bodyColor, 1);
    gfx.beginPath();
    gfx.arc(-22, -10, 12, Math.PI * 0.5, Math.PI * 1.5);
    gfx.strokePath();
  },

  drawDachshund: function (gfx, breed) {
    // Long body
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillEllipse(0, 0, 40, 12);

    // Head
    gfx.fillCircle(35, -4, 10);
    gfx.fillEllipse(42, -2, 8, 5);

    // Floppy ears
    gfx.fillStyle(breed.accentColor, 1);
    gfx.fillEllipse(28, 2, 8, 12);
    gfx.fillEllipse(38, 0, 6, 10);

    // Eyes
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(34, -6, 2);
    gfx.fillCircle(40, -5, 2);

    // Nose
    gfx.fillCircle(48, -2, 3);

    // Short legs
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillRect(-30, 6, 5, 10);
    gfx.fillRect(-20, 6, 5, 10);
    gfx.fillRect(15, 6, 5, 10);
    gfx.fillRect(25, 6, 5, 10);

    // Tail
    gfx.lineStyle(4, breed.bodyColor, 1);
    gfx.beginPath();
    gfx.moveTo(-35, 0);
    gfx.lineTo(-42, -8);
    gfx.strokePath();
  },

  drawGolden: function (gfx, breed) {
    // Fluffy medium body
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillEllipse(0, 0, 28, 18);

    // Lighter chest fluff
    gfx.fillStyle(breed.accentColor, 1);
    gfx.fillEllipse(10, 4, 14, 10);

    // Head
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillCircle(22, -6, 14);

    // Muzzle
    gfx.fillEllipse(32, -2, 8, 6);

    // Floppy ears
    gfx.fillEllipse(12, 2, 8, 14);
    gfx.fillEllipse(28, 4, 6, 12);

    // Eyes (sweet expression)
    gfx.fillStyle(0x5D4037, 1);
    gfx.fillCircle(18, -8, 3);
    gfx.fillCircle(26, -7, 3);
    gfx.fillStyle(0xFFFFFF, 0.7);
    gfx.fillCircle(17, -9, 1);
    gfx.fillCircle(25, -8, 1);

    // Nose
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(38, -2, 3);

    // Legs
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillRect(-18, 12, 8, 14);
    gfx.fillRect(-6, 12, 8, 14);
    gfx.fillRect(6, 12, 8, 14);
    gfx.fillRect(18, 12, 8, 14);

    // Fluffy tail
    gfx.fillEllipse(-26, -5, 10, 8);
    gfx.fillEllipse(-30, -10, 6, 6);
  },

  drawDalmatian: function (gfx, breed) {
    // Medium body
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillEllipse(0, 0, 26, 16);

    // Head
    gfx.fillCircle(20, -6, 13);
    gfx.fillEllipse(30, -3, 7, 5);

    // Floppy ears
    gfx.fillEllipse(10, 2, 7, 12);
    gfx.fillEllipse(26, 2, 5, 10);

    // Spots!
    gfx.fillStyle(breed.accentColor, 1);
    gfx.fillCircle(-8, -4, 5);
    gfx.fillCircle(5, 4, 4);
    gfx.fillCircle(-15, 2, 3);
    gfx.fillCircle(12, -2, 3);
    gfx.fillCircle(16, -12, 4);
    gfx.fillCircle(24, -14, 3);
    gfx.fillCircle(8, 0, 6);
    gfx.fillCircle(-12, 6, 3);

    // Eyes
    gfx.fillStyle(0x5D4037, 1);
    gfx.fillCircle(17, -8, 2.5);
    gfx.fillCircle(24, -7, 2.5);

    // Nose
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(34, -3, 3);

    // Legs
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillRect(-16, 10, 7, 14);
    gfx.fillRect(-5, 10, 7, 14);
    gfx.fillRect(5, 10, 7, 14);
    gfx.fillRect(16, 10, 7, 14);

    // Spot on leg
    gfx.fillStyle(breed.accentColor, 1);
    gfx.fillCircle(-12, 16, 3);
    gfx.fillCircle(10, 18, 2);

    // Tail
    gfx.lineStyle(5, breed.bodyColor, 1);
    gfx.beginPath();
    gfx.moveTo(-22, 0);
    gfx.lineTo(-28, -10);
    gfx.lineTo(-26, -18);
    gfx.strokePath();
  },

  // --- Speech Bubble ---

  showSpeechBubble: function (itemData) {
    if (!this.dogGroup) return;

    var bubbleX = this.dogGroup.x + 20;
    var bubbleY = this.dogGroup.y - 90;

    this.speechBubble = this.add.container(bubbleX, bubbleY);
    this.speechBubble.setDepth(25);

    var gfx = this.add.graphics();

    // Bubble background
    gfx.fillStyle(0xFFFFFF, 0.95);
    gfx.fillRoundedRect(-35, -25, 70, 50, 12);

    // Bubble tail
    gfx.beginPath();
    gfx.moveTo(-5, 25);
    gfx.lineTo(5, 25);
    gfx.lineTo(-10, 40);
    gfx.closePath();
    gfx.fillPath();

    // Border
    gfx.lineStyle(2, 0xBDBDBD, 1);
    gfx.strokeRoundedRect(-35, -25, 70, 50, 12);

    this.speechBubble.add(gfx);

    // Show emoji (spelling) or math problem (math)
    if (itemData && itemData.visual) {
      // Spelling mode: show emoji
      var emojiText = this.add.text(0, 0, itemData.visual, {
        fontSize: '32px',
      });
      emojiText.setOrigin(0.5);
      this.speechBubble.add(emojiText);
    } else if (itemData && itemData.display) {
      // Math mode: show the problem (e.g., "3 + 5")
      var problemText = this.add.text(0, 0, itemData.display, {
        fontSize: '18px',
        fontFamily: 'Nunito, sans-serif',
        fontStyle: 'bold',
        color: '#6c5ce7',
      });
      problemText.setOrigin(0.5);
      this.speechBubble.add(problemText);
    }

    // Pop in animation
    this.speechBubble.setScale(0);
    this.tweens.add({
      targets: this.speechBubble,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  },

  // --- Potty Dance ---

  startPottyDance: function () {
    if (!this.dogGroup) return;

    this.urgencyLevel = 0;
    this.doPottyDance();
  },

  updatePottyDanceIntensity: function (timerRatio) {
    // Map timer ratio to urgency level
    var newLevel;
    if (timerRatio > 0.7) {
      newLevel = 0; // Mild
    } else if (timerRatio > 0.4) {
      newLevel = 1; // Worried
    } else if (timerRatio > 0.2) {
      newLevel = 2; // Frantic
    } else {
      newLevel = 3; // Desperate
    }

    if (newLevel !== this.urgencyLevel) {
      this.urgencyLevel = newLevel;
      this.doPottyDance();
    }
  },

  doPottyDance: function () {
    if (!this.dogGroup) return;

    // Stop existing tween
    if (this.pottyDanceTween) {
      this.pottyDanceTween.stop();
    }

    var params = [
      { offsetX: 3, offsetY: 2, speed: 400, angle: 3 },    // Mild wiggle
      { offsetX: 5, offsetY: 4, speed: 250, angle: 5 },    // Worried hop
      { offsetX: 8, offsetY: 6, speed: 150, angle: 8 },    // Frantic
      { offsetX: 12, offsetY: 8, speed: 80, angle: 12 },   // Desperate
    ];

    var p = params[Math.min(this.urgencyLevel, params.length - 1)];
    var baseX = this.dogGroup.x;
    var baseY = this.dogGroup.y;

    this.pottyDanceTween = this.tweens.add({
      targets: this.dogGroup,
      x: { from: baseX - p.offsetX, to: baseX + p.offsetX },
      y: { from: baseY, to: baseY - p.offsetY },
      angle: { from: -p.angle, to: p.angle },
      duration: p.speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  },

  stopPottyDance: function () {
    if (this.pottyDanceTween) {
      this.pottyDanceTween.stop();
      this.pottyDanceTween = null;
    }
    if (this.dogGroup) {
      this.dogGroup.angle = 0;
    }
  },

  // --- Success Animation ---

  dogSuccess: function (callback) {
    if (!this.dogGroup) {
      if (callback) callback();
      return;
    }

    var scene = this;
    var w = this.scale.width;

    // Track this breed for victory parade
    if (this.currentDog) {
      this.helpedBreeds.push(this.currentDog);
    }

    this.stopPottyDance();

    // Hide speech bubble
    if (this.speechBubble) {
      this.tweens.add({
        targets: this.speechBubble,
        scaleX: 0,
        scaleY: 0,
        duration: 200,
      });
    }

    // Dog runs toward Ava
    this.tweens.add({
      targets: this.dogGroup,
      x: w * 0.55,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: function () {
        // Show "YAY!" or "CHOMP!" text
        var yayText = scene.add.text(scene.dogGroup.x, scene.dogGroup.y - 50, 'YAY!', {
          fontSize: '28px',
          fontStyle: 'bold',
          color: '#4CAF50',
        });
        yayText.setOrigin(0.5);
        yayText.setDepth(30);

        scene.tweens.add({
          targets: yayText,
          y: yayText.y - 30,
          alpha: 0,
          duration: 800,
          ease: 'Quad.easeOut',
          onComplete: function () { yayText.destroy(); },
        });

        // Heart burst
        scene.createHeartBurst(scene.dogGroup.x, scene.dogGroup.y - 20);

        // Tail wag (quick rotation back and forth)
        scene.tweens.add({
          targets: scene.dogGroup,
          angle: 8,
          duration: 80,
          yoyo: true,
          repeat: 5,
          ease: 'Sine.easeInOut',
        });

        // Happy jump
        scene.tweens.add({
          targets: scene.dogGroup,
          y: scene.dogGroup.y - 25,
          duration: 200,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: function () {
            // Dog trots off screen happily
            scene.tweens.add({
              targets: scene.dogGroup,
              x: w + 100,
              duration: 800,
              ease: 'Quad.easeIn',
              onComplete: function () {
                if (scene.dogGroup) {
                  scene.dogGroup.destroy();
                  scene.dogGroup = null;
                }
                if (scene.speechBubble) {
                  scene.speechBubble.destroy();
                  scene.speechBubble = null;
                }
                if (callback) callback();
              },
            });
          },
        });
      },
    });
  },

  createHeartBurst: function (x, y) {
    var emitter = this.add.particles(x, y, 'dd_heart', {
      speed: { min: 50, max: 120 },
      angle: { min: 220, max: 320 },
      lifespan: 800,
      scale: { start: 0.8, end: 0 },
      quantity: 8,
      tint: [0xFF6B6B, 0xE91E63, 0xFF4081],
      emitting: false,
    });
    emitter.setDepth(35);
    emitter.explode();

    this.time.delayedCall(1000, function () { emitter.destroy(); });
  },

  // --- Failure Animation (The Poop!) ---

  dogAccident: function (callback) {
    if (!this.dogGroup) {
      if (callback) callback();
      return;
    }

    var scene = this;
    var flyContainer = null;

    this.stopPottyDance();

    // Hide speech bubble
    if (this.speechBubble) {
      this.tweens.add({
        targets: this.speechBubble,
        scaleX: 0,
        scaleY: 0,
        duration: 200,
      });
    }

    // Dog squats slightly
    this.tweens.add({
      targets: this.dogGroup,
      y: this.dogGroup.y + 15,
      scaleY: 0.8,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: function () {
        // POOP TIME!
        var poopX = scene.dogGroup.x - 50;
        var poopY = scene.dogGroup.y + 20;

        // Poop emoji shoots out
        var poop = scene.add.text(poopX, poopY, '\uD83D\uDCA9', {
          fontSize: '42px',
        });
        poop.setOrigin(0.5);
        poop.setDepth(30);
        poop.setScale(0);

        // Pop out animation
        scene.tweens.add({
          targets: poop,
          scaleX: 1,
          scaleY: 1,
          x: poopX - 20,
          y: poopY + 30,
          angle: 360,
          duration: 500,
          ease: 'Bounce.easeOut',
        });

        // Splat particles
        var splatEmitter = scene.add.particles(poopX - 20, poopY + 20, 'dd_splat', {
          speed: { min: 30, max: 80 },
          angle: { min: 200, max: 340 },
          lifespan: 600,
          scale: { start: 0.6, end: 0 },
          quantity: 10,
          tint: [0x795548, 0x5D4037, 0x8D6E63],
          emitting: false,
        });
        splatEmitter.setDepth(28);
        splatEmitter.explode();

        scene.time.delayedCall(800, function () { splatEmitter.destroy(); });

        // Add permanent ground splat
        var splatOnGround = scene.add.text(poopX - 30, scene.groundY - 10, '\uD83D\uDCA9', {
          fontSize: '24px',
        });
        splatOnGround.setOrigin(0.5);
        splatOnGround.setDepth(5);
        splatOnGround.setAlpha(0.7);

        // === NEW: STINK CLOUD ===
        // Green stink particles rising from the poop
        var stinkEmitter = scene.add.particles(poopX - 30, scene.groundY - 20, 'dd_stink', {
          speed: { min: 20, max: 50 },
          angle: { min: 250, max: 290 },
          lifespan: 1500,
          scale: { start: 0.4, end: 0.8 },
          alpha: { start: 0.6, end: 0 },
          quantity: 2,
          frequency: 200,
          tint: [0x8BC34A, 0x9CCC65, 0x7CB342],
        });
        stinkEmitter.setDepth(29);

        // === NEW: BUZZING FLY ===
        flyContainer = scene.add.container(poopX - 30, scene.groundY - 30);
        flyContainer.setDepth(31);
        var flyGfx = scene.add.graphics();
        // Fly body
        flyGfx.fillStyle(0x000000, 1);
        flyGfx.fillEllipse(0, 0, 6, 4);
        // Fly wings
        flyGfx.fillStyle(0xB3E5FC, 0.7);
        flyGfx.fillEllipse(-3, -3, 5, 3);
        flyGfx.fillEllipse(3, -3, 5, 3);
        // Fly eyes
        flyGfx.fillStyle(0xFF0000, 1);
        flyGfx.fillCircle(4, 0, 1.5);
        flyContainer.add(flyGfx);

        // Fly buzzes in circles around the poop
        scene.tweens.add({
          targets: flyContainer,
          x: { from: poopX - 50, to: poopX - 10 },
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        scene.tweens.add({
          targets: flyContainer,
          y: { from: scene.groundY - 40, to: scene.groundY - 20 },
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        // Wing flutter
        scene.tweens.add({
          targets: flyContainer,
          angle: { from: -10, to: 10 },
          duration: 50,
          yoyo: true,
          repeat: -1,
        });

        // "Oops!" text
        var oopsText = scene.add.text(scene.dogGroup.x, scene.dogGroup.y - 70, 'Oops!', {
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#C62828',
        });
        oopsText.setOrigin(0.5);
        oopsText.setDepth(30);

        scene.tweens.add({
          targets: oopsText,
          y: oopsText.y - 20,
          alpha: 0,
          duration: 1000,
          ease: 'Quad.easeOut',
          onComplete: function () { oopsText.destroy(); },
        });

        // === NEW: DOG LOOKS BACK AT MESS ===
        // Flip the dog to face the poop (embarrassed look-back)
        scene.time.delayedCall(400, function () {
          if (scene.dogGroup) {
            scene.tweens.add({
              targets: scene.dogGroup,
              scaleX: -1,  // Flip horizontally to look back
              duration: 200,
              ease: 'Quad.easeOut',
            });
          }
        });

        // Dog looks embarrassed/angry - shake head
        scene.time.delayedCall(800, function () {
          if (!scene.dogGroup) return;

          // Shake head (angry/embarrassed)
          scene.tweens.add({
            targets: scene.dogGroup,
            x: scene.dogGroup.x - 5,
            duration: 60,
            yoyo: true,
            repeat: 3,
            ease: 'Linear',
          });

          // Dog walks off in a huff (flip back and exit left)
          scene.time.delayedCall(500, function () {
            if (!scene.dogGroup) return;

            // Flip back to normal direction
            scene.tweens.add({
              targets: scene.dogGroup,
              scaleX: 1,
              duration: 150,
            });

            scene.tweens.add({
              targets: scene.dogGroup,
              x: -100,
              scaleY: 1,
              duration: 1000,
              ease: 'Quad.easeIn',
              onComplete: function () {
                if (scene.dogGroup) {
                  scene.dogGroup.destroy();
                  scene.dogGroup = null;
                }
                if (scene.speechBubble) {
                  scene.speechBubble.destroy();
                  scene.speechBubble = null;
                }

                // Stop stink and fly
                stinkEmitter.stop();
                scene.time.delayedCall(1500, function () {
                  stinkEmitter.destroy();
                });

                // Fade out ground poop, fly
                scene.tweens.add({
                  targets: [poop, splatOnGround, flyContainer],
                  alpha: 0,
                  duration: 500,
                  delay: 500,
                  onComplete: function () {
                    poop.destroy();
                    splatOnGround.destroy();
                    if (flyContainer) flyContainer.destroy();
                  },
                });
                if (callback) callback();
              },
            });
          });
        });
      },
    });
  },

  // --- Letter Progress ---

  onLetterCorrect: function () {
    if (!this.dogGroup) return;

    // Small happy hop
    this.tweens.add({
      targets: this.dogGroup,
      y: this.dogGroup.y - 5,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  },

  // --- Victory Animation ---

  showVictoryAnimation: function () {
    var w = this.scale.width;
    var h = this.scale.height;
    var scene = this;

    // Confetti burst
    var confettiGfx = this.make.graphics({ x: 0, y: 0, add: false });
    confettiGfx.fillStyle(0xffffff, 1);
    confettiGfx.fillRect(0, 0, 8, 8);
    confettiGfx.generateTexture('dd_confetti', 8, 8);
    confettiGfx.destroy();

    for (var i = 0; i < 3; i++) {
      (function (idx) {
        var delay = idx * 300;
        scene.time.delayedCall(delay, function () {
          var x = w * 0.2 + Math.random() * w * 0.6;
          var emitter = scene.add.particles(x, -10, 'dd_confetti', {
            speed: { min: 50, max: 150 },
            angle: { min: 70, max: 110 },
            lifespan: 2000,
            scale: { start: 0.6, end: 0.2 },
            quantity: 20,
            tint: [0xE91E63, 0xFFC107, 0x4CAF50, 0x2196F3, 0x9C27B0],
            emitting: false,
          });
          emitter.setDepth(80);
          emitter.explode();

          scene.time.delayedCall(2500, function () { emitter.destroy(); });
        });
      })(i);
    }

    // Ava celebrates
    if (this.avaGroup) {
      this.tweens.add({
        targets: this.avaGroup,
        y: this.avaGroup.y - 20,
        duration: 200,
        yoyo: true,
        repeat: 3,
        ease: 'Quad.easeOut',
      });
    }

    // === VICTORY PARADE OF HAPPY DOGS ===
    // Show all the dogs we helped marching across happily!
    if (this.helpedBreeds && this.helpedBreeds.length > 0) {
      scene.time.delayedCall(800, function () {
        scene.startDogParade();
      });
    }
  },

  // Dog parade - all helped dogs march across screen
  startDogParade: function () {
    var scene = this;
    var w = this.scale.width;
    var startX = -80;
    var y = this.groundY - 25;

    // Parade each dog with staggered timing
    for (var i = 0; i < this.helpedBreeds.length; i++) {
      (function (idx, breed) {
        var delay = idx * 400;  // Stagger each dog

        scene.time.delayedCall(delay, function () {
          // Create mini parade dog
          var paradeDog = scene.add.container(startX, y);
          paradeDog.setDepth(50 + idx);
          paradeDog.setScale(1.5);  // Smaller than gameplay dogs

          var gfx = scene.add.graphics();

          // Draw simplified happy dog based on breed
          scene.drawParadeDog(gfx, breed);
          paradeDog.add(gfx);

          // Add little heart above dog
          var heart = scene.add.text(0, -35, '\u2764\uFE0F', { fontSize: '16px' });
          heart.setOrigin(0.5);
          paradeDog.add(heart);

          // Heart bobbing
          scene.tweens.add({
            targets: heart,
            y: -40,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });

          // Happy bouncing walk
          scene.tweens.add({
            targets: paradeDog,
            y: y - 8,
            duration: 200,
            yoyo: true,
            repeat: -1,
            ease: 'Quad.easeOut',
          });

          // Tail wag (rotation)
          scene.tweens.add({
            targets: paradeDog,
            angle: { from: -5, to: 5 },
            duration: 150,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });

          // March across screen
          scene.tweens.add({
            targets: paradeDog,
            x: w + 80,
            duration: 4000,
            ease: 'Linear',
            onComplete: function () {
              paradeDog.destroy();
            },
          });
        });
      })(i, this.helpedBreeds[i]);
    }
  },

  // Draw a simplified happy parade dog
  drawParadeDog: function (gfx, breed) {
    // Simple body
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillEllipse(0, 0, 20, 12);

    // Head
    gfx.fillCircle(14, -5, 10);

    // Accent (chest or spots based on breed)
    if (breed.name === 'dalmatian') {
      gfx.fillStyle(breed.accentColor, 1);
      gfx.fillCircle(-5, 0, 3);
      gfx.fillCircle(5, 2, 2);
      gfx.fillCircle(12, -8, 2);
    } else {
      gfx.fillStyle(breed.accentColor, 1);
      gfx.fillEllipse(8, 2, 8, 5);
    }

    // Happy eyes (closed arcs for smiling)
    gfx.lineStyle(2, 0x000000, 1);
    gfx.beginPath();
    gfx.arc(11, -6, 3, Math.PI, 0);
    gfx.strokePath();
    gfx.beginPath();
    gfx.arc(17, -6, 3, Math.PI, 0);
    gfx.strokePath();

    // Nose
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(22, -3, 2);

    // Wagging tail
    gfx.lineStyle(4, breed.bodyColor, 1);
    gfx.beginPath();
    gfx.moveTo(-15, 0);
    gfx.lineTo(-22, -8);
    gfx.strokePath();

    // Little legs
    gfx.fillStyle(breed.bodyColor, 1);
    gfx.fillRect(-10, 8, 4, 8);
    gfx.fillRect(-2, 8, 4, 8);
    gfx.fillRect(6, 8, 4, 8);

    // Ears based on type
    if (breed.earType === 'pointy') {
      gfx.fillStyle(breed.bodyColor, 1);
      gfx.beginPath();
      gfx.moveTo(8, -12);
      gfx.lineTo(6, -22);
      gfx.lineTo(12, -14);
      gfx.closePath();
      gfx.fillPath();
      gfx.beginPath();
      gfx.moveTo(16, -14);
      gfx.lineTo(20, -22);
      gfx.lineTo(18, -12);
      gfx.closePath();
      gfx.fillPath();
    } else if (breed.earType === 'fluffy') {
      gfx.fillStyle(breed.bodyColor, 1);
      gfx.fillCircle(6, -3, 7);
      gfx.fillCircle(18, -3, 5);
    } else {
      // Floppy
      gfx.fillStyle(breed.bodyColor, 1);
      gfx.fillEllipse(6, 2, 5, 8);
      gfx.fillEllipse(18, 2, 4, 7);
    }
  },

  // --- Easter Eggs ---

  startEasterEggs: function () {
    this.easterEggActive = false;
    this.scheduleNextEasterEgg();
  },

  scheduleNextEasterEgg: function () {
    var delay = 15000 + Math.random() * 20000;
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
      this.eggSquirrelAlert();
    } else if (roll < 50) {
      this.eggBallBounce();
    } else if (roll < 70) {
      this.eggZoomies();
    } else {
      this.eggSleepingDog();
    }
  },

  eggSquirrelAlert: function () {
    var scene = this;
    var w = this.scale.width;

    // Squirrel runs across
    var squirrel = this.add.container(-30, this.groundY - 20);
    squirrel.setDepth(18);

    var gfx = this.add.graphics();
    // Body
    gfx.fillStyle(0x795548, 1);
    gfx.fillEllipse(0, 0, 15, 10);
    // Head
    gfx.fillCircle(10, -5, 8);
    // Tail (fluffy S-curve using ellipses)
    gfx.fillStyle(0x8D6E63, 1);
    gfx.fillEllipse(-15, -8, 10, 8);
    gfx.fillEllipse(-18, -18, 8, 10);
    gfx.fillEllipse(-12, -26, 6, 8);
    // Eye
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(14, -6, 2);

    squirrel.add(gfx);

    // Run animation
    this.tweens.add({
      targets: squirrel,
      x: w + 50,
      duration: 2000,
      ease: 'Linear',
      onComplete: function () {
        squirrel.destroy();
        scene.easterEggActive = false;
      },
    });

    // Hop animation
    this.tweens.add({
      targets: squirrel,
      y: this.groundY - 30,
      duration: 150,
      yoyo: true,
      repeat: 6,
      ease: 'Quad.easeOut',
    });
  },

  eggBallBounce: function () {
    var scene = this;
    var w = this.scale.width;

    // Tennis ball bounces across
    var ball = this.add.graphics();
    ball.fillStyle(0xCDDC39, 1);
    ball.fillCircle(0, 0, 12);
    ball.lineStyle(2, 0xAFB42B, 1);
    ball.beginPath();
    ball.arc(0, 0, 12, 0.5, 2.5);
    ball.strokePath();
    ball.setDepth(19);

    ball.x = -30;
    ball.y = this.groundY - 30;

    this.tweens.add({
      targets: ball,
      x: w + 50,
      duration: 3000,
      ease: 'Linear',
      onComplete: function () {
        ball.destroy();
        scene.easterEggActive = false;
      },
    });

    // Bounce animation
    this.tweens.add({
      targets: ball,
      y: this.groundY - 60,
      duration: 300,
      yoyo: true,
      repeat: 4,
      ease: 'Quad.easeOut',
    });

    // Spin
    this.tweens.add({
      targets: ball,
      angle: 720,
      duration: 3000,
      ease: 'Linear',
    });
  },

  eggZoomies: function () {
    var scene = this;
    var w = this.scale.width;

    // Background dog does sudden zoomies
    var zoomDog = this.add.container(-50, this.groundY - 15);
    zoomDog.setDepth(3);
    zoomDog.setScale(0.7);

    var gfx = this.add.graphics();
    // Simple dog shape (blur lines for speed)
    gfx.fillStyle(0xFFB74D, 0.8);
    gfx.fillEllipse(0, 0, 25, 12);
    gfx.fillCircle(15, -5, 10);
    // Speed lines
    gfx.lineStyle(2, 0xFFB74D, 0.5);
    for (var i = 0; i < 4; i++) {
      gfx.beginPath();
      gfx.moveTo(-30 - i * 8, -5 + i * 3);
      gfx.lineTo(-40 - i * 8, -5 + i * 3);
      gfx.strokePath();
    }

    zoomDog.add(gfx);

    this.tweens.add({
      targets: zoomDog,
      x: w + 80,
      duration: 1200,
      ease: 'Quad.easeIn',
      onComplete: function () {
        zoomDog.destroy();
        scene.easterEggActive = false;
      },
    });
  },

  eggSleepingDog: function () {
    var scene = this;
    var w = this.scale.width;

    // Show "Zzz" bubbles from corner
    var sleepX = w * 0.1;
    var sleepY = this.groundY + 20;

    var zzz1 = this.add.text(sleepX, sleepY, 'z', { fontSize: '14px', color: '#90A4AE' });
    var zzz2 = this.add.text(sleepX + 10, sleepY - 10, 'Z', { fontSize: '18px', color: '#78909C' });
    var zzz3 = this.add.text(sleepX + 20, sleepY - 25, 'Z', { fontSize: '22px', color: '#607D8B' });

    zzz1.setDepth(10);
    zzz2.setDepth(10);
    zzz3.setDepth(10);

    // Float up animation
    var floatTween = function (target, delay) {
      scene.tweens.add({
        targets: target,
        y: target.y - 30,
        alpha: 0,
        duration: 1500,
        delay: delay,
        ease: 'Quad.easeOut',
        onComplete: function () { target.destroy(); },
      });
    };

    floatTween(zzz1, 0);
    floatTween(zzz2, 300);
    floatTween(zzz3, 600);

    this.time.delayedCall(2500, function () {
      scene.easterEggActive = false;
    });
  },

  // --- Cleanup ---

  shutdown: function () {
    if (this.dogGroup) {
      this.dogGroup.destroy();
      this.dogGroup = null;
    }
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
    if (this.pottyDanceTween) {
      this.pottyDanceTween.stop();
      this.pottyDanceTween = null;
    }
  },
});
