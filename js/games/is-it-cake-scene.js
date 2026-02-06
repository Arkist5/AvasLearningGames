/**
 * Is It Cake? Scene - Phaser 3 Scene with bakery visuals.
 * Warm bakery background, items on pedestals, knife-slice animations.
 *
 * All art is drawn with Phaser Graphics API (zero external assets).
 */

var IsItCakeScene = new Phaser.Class({

  Extends: Phaser.Scene,

  initialize: function IsItCakeScene() {
    Phaser.Scene.call(this, { key: 'IsItCakeScene' });

    // Scene objects
    this.timerBar = null;
    this.timerBarBg = null;

    // Item display
    this.itemContainers = []; // 3 containers, one per pedestal
    this.itemEmojis = [];     // Emoji text objects
    this.itemLabels = [];     // Name labels
    this.glowRings = [];      // Golden glow rings
    this.pedestalXPositions = [];

    // State
    this.pickingEnabled = false;
    this.roundItems = [];

    // Easter egg
    this.easterEggActive = false;

    // Bakery background elements (for reference in animations)
    this.groundY = 0;
    this.counterY = 0;
  },

  create: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    this.groundY = h * 0.95;
    this.counterY = h * 0.62;

    // Pedestal x positions
    this.pedestalXPositions = [w * 0.2, w * 0.5, w * 0.8];

    // Draw bakery
    this.drawBackground(w, h);
    this.drawCounter(w, h);
    this.drawDecorations(w, h);

    // Timer bar
    this.createTimerBar(w);

    // Create particle textures
    this.createParticleTextures();

    // Banner text
    this.drawBanner(w, h);

    // Start easter egg scheduler
    this.startEasterEggs();

    // Notify controller that scene is ready
    if (typeof IsItCake !== 'undefined' && IsItCake._pendingInit) {
      IsItCake._pendingInit(this);
      IsItCake._pendingInit = null;
    }
  },

  update: function () {
    // Nothing continuous needed
  },

  // --- Background ---

  drawBackground: function (w, h) {
    var gfx = this.add.graphics();

    // Warm cream-to-peach gradient (bakery feel)
    var steps = 12;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      var r = Math.round(255 - t * 15);
      var g = Math.round(248 - t * 30);
      var b = Math.round(231 - t * 40);
      var color = (r << 16) | (g << 8) | b;
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, (h * i) / steps, w, h / steps + 1);
    }

    // Tiled floor at very bottom
    gfx.fillStyle(0xD7CCC8, 1);
    gfx.fillRect(0, this.groundY, w, h - this.groundY);

    // Checkerboard pattern on floor
    var tileSize = 20;
    for (var tx = 0; tx < w; tx += tileSize) {
      for (var ty = this.groundY; ty < h; ty += tileSize) {
        if ((Math.floor(tx / tileSize) + Math.floor(ty / tileSize)) % 2 === 0) {
          gfx.fillStyle(0xBCAAA4, 0.5);
          gfx.fillRect(tx, ty, tileSize, tileSize);
        }
      }
    }
  },

  drawCounter: function (w, h) {
    var gfx = this.add.graphics();

    // Counter/display table surface
    gfx.fillStyle(0x8D6E63, 1);
    gfx.fillRect(0, this.counterY, w, 12);

    // Glass display case sides (subtle)
    gfx.lineStyle(2, 0xB0BEC5, 0.4);
    gfx.strokeRect(w * 0.05, this.counterY - 5, w * 0.9, 8);

    // Counter front (darker wood)
    gfx.fillStyle(0x6D4C41, 1);
    gfx.fillRect(0, this.counterY + 12, w, h * 0.1);

    // Wood grain lines
    gfx.lineStyle(1, 0x5D4037, 0.3);
    for (var i = 0; i < 4; i++) {
      var ly = this.counterY + 14 + i * (h * 0.1 / 4);
      gfx.beginPath();
      gfx.moveTo(0, ly);
      gfx.lineTo(w, ly);
      gfx.strokePath();
    }
  },

  drawDecorations: function (w, h) {
    var gfx = this.add.graphics();

    // Hanging pendant lights
    for (var i = 0; i < 3; i++) {
      var lx = this.pedestalXPositions[i];

      // Wire
      gfx.lineStyle(2, 0x757575, 0.6);
      gfx.beginPath();
      gfx.moveTo(lx, 0);
      gfx.lineTo(lx, h * 0.08);
      gfx.strokePath();

      // Lamp shade (cone)
      gfx.fillStyle(0xFFCC80, 0.9);
      gfx.beginPath();
      gfx.moveTo(lx - 18, h * 0.08);
      gfx.lineTo(lx + 18, h * 0.08);
      gfx.lineTo(lx + 10, h * 0.04);
      gfx.lineTo(lx - 10, h * 0.04);
      gfx.closePath();
      gfx.fillPath();

      // Warm glow
      gfx.fillStyle(0xFFF8E1, 0.15);
      gfx.fillCircle(lx, h * 0.12, 35);
    }

    // Bunting flags across top
    this.drawBunting(gfx, w, h);

    // Oven area on the right
    this.drawOven(gfx, w, h);

    // Cake display on left
    this.drawCakeDisplay(gfx, w, h);
  },

  drawBunting: function (gfx, w, h) {
    var colors = [0xE91E63, 0xFFC107, 0x4CAF50, 0x2196F3, 0x9C27B0];
    var flagCount = Math.ceil(w / 30);
    var ropeY = h * 0.02;

    // Rope
    gfx.lineStyle(2, 0x795548, 0.6);
    gfx.beginPath();
    gfx.moveTo(0, ropeY);
    for (var i = 0; i <= flagCount; i++) {
      var fx = (w * i) / flagCount;
      var sag = Math.sin(Math.PI * i / flagCount) * 8;
      gfx.lineTo(fx, ropeY + sag);
    }
    gfx.strokePath();

    // Flags
    for (var i = 0; i < flagCount; i++) {
      var fx = (w * i) / flagCount + 15;
      var sag = Math.sin(Math.PI * i / flagCount) * 8;
      var fy = ropeY + sag;

      gfx.fillStyle(colors[i % colors.length], 0.8);
      gfx.beginPath();
      gfx.moveTo(fx - 8, fy);
      gfx.lineTo(fx + 8, fy);
      gfx.lineTo(fx, fy + 16);
      gfx.closePath();
      gfx.fillPath();
    }
  },

  drawOven: function (gfx, w, h) {
    var ox = w * 0.9;
    var oy = this.counterY + h * 0.1 + 10;

    // Oven body
    gfx.fillStyle(0x90A4AE, 1);
    gfx.fillRoundedRect(ox - 25, oy, 50, 50, 4);

    // Oven window
    gfx.fillStyle(0x37474F, 1);
    gfx.fillRoundedRect(ox - 18, oy + 8, 36, 25, 4);

    // Warm glow inside
    gfx.fillStyle(0xFF8A65, 0.4);
    gfx.fillRoundedRect(ox - 15, oy + 10, 30, 20, 3);

    // Handle
    gfx.fillStyle(0xCFD8DC, 1);
    gfx.fillRoundedRect(ox - 12, oy + 36, 24, 4, 2);

    // Knobs
    gfx.fillStyle(0x546E7A, 1);
    gfx.fillCircle(ox - 10, oy + 46, 3);
    gfx.fillCircle(ox, oy + 46, 3);
    gfx.fillCircle(ox + 10, oy + 46, 3);
  },

  drawCakeDisplay: function (gfx, w, h) {
    var cx = w * 0.08;
    var cy = this.counterY + h * 0.1 + 15;

    // Glass dome base
    gfx.fillStyle(0xECEFF1, 0.5);
    gfx.fillRoundedRect(cx - 20, cy + 20, 40, 6, 3);

    // Mini cake inside
    gfx.fillStyle(0xFFCDD2, 1);
    gfx.fillRoundedRect(cx - 12, cy + 5, 24, 15, 3);
    gfx.fillStyle(0xFFFFFF, 1);
    gfx.fillRect(cx - 12, cy + 10, 24, 4);
    gfx.fillStyle(0xF48FB1, 1);
    gfx.fillRoundedRect(cx - 14, cy + 2, 28, 5, 2);

    // Cherry
    gfx.fillStyle(0xC62828, 1);
    gfx.fillCircle(cx, cy - 1, 4);
    gfx.lineStyle(1, 0x4CAF50, 1);
    gfx.beginPath();
    gfx.moveTo(cx, cy - 5);
    gfx.lineTo(cx + 3, cy - 10);
    gfx.strokePath();

    // Glass dome (arc)
    gfx.lineStyle(2, 0xB0BEC5, 0.6);
    gfx.beginPath();
    gfx.arc(cx, cy + 22, 22, Math.PI, 0);
    gfx.strokePath();
  },

  // --- Banner ---

  drawBanner: function (w, h) {
    var bannerY = h * 0.14;

    // Banner background
    var bannerGfx = this.add.graphics();
    bannerGfx.fillStyle(0xE91E63, 0.9);
    bannerGfx.fillRoundedRect(w * 0.15, bannerY - 14, w * 0.7, 28, 14);
    bannerGfx.setDepth(5);

    var bannerText = this.add.text(w * 0.5, bannerY, 'IS IT CAKE?', {
      fontSize: '18px',
      fontFamily: 'Fredoka One, Nunito, sans-serif',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#C2185B',
      strokeThickness: 2,
    });
    bannerText.setOrigin(0.5);
    bannerText.setDepth(6);
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

  // --- Particle Textures ---

  createParticleTextures: function () {
    // Sprinkle particle
    var sprinkleGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sprinkleGfx.fillStyle(0xFFFFFF, 1);
    sprinkleGfx.fillRoundedRect(0, 0, 6, 3, 1);
    sprinkleGfx.generateTexture('iic_sprinkle', 6, 3);
    sprinkleGfx.destroy();

    // Spark particle
    var sparkGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sparkGfx.fillStyle(0xFFD700, 1);
    sparkGfx.fillCircle(4, 4, 4);
    sparkGfx.generateTexture('iic_spark', 8, 8);
    sparkGfx.destroy();

    // Confetti
    var confettiGfx = this.make.graphics({ x: 0, y: 0, add: false });
    confettiGfx.fillStyle(0xffffff, 1);
    confettiGfx.fillRect(0, 0, 8, 8);
    confettiGfx.generateTexture('iic_confetti', 8, 8);
    confettiGfx.destroy();

    // Crumb
    var crumbGfx = this.make.graphics({ x: 0, y: 0, add: false });
    crumbGfx.fillStyle(0xD7CCC8, 1);
    crumbGfx.fillCircle(3, 3, 3);
    crumbGfx.generateTexture('iic_crumb', 6, 6);
    crumbGfx.destroy();
  },

  // --- Items on Pedestals ---

  showNewRound: function (items) {
    var scene = this;
    var w = this.scale.width;
    var h = this.scale.height;

    this.roundItems = items;
    this.pickingEnabled = false;

    // Clear old items
    this.clearItems();

    // Create 3 items on pedestals
    for (var i = 0; i < 3; i++) {
      (function (idx) {
        var px = scene.pedestalXPositions[idx];
        var py = scene.counterY - 20;

        // Container for item
        var container = scene.add.container(px, h + 60); // Start below screen
        container.setDepth(20 + idx);

        // Pedestal (glass stand)
        var pedGfx = scene.add.graphics();
        // Stand base
        pedGfx.fillStyle(0xB0BEC5, 0.7);
        pedGfx.fillEllipse(0, 8, 50, 10);
        // Stand column
        pedGfx.fillStyle(0xCFD8DC, 0.6);
        pedGfx.fillRect(-4, -10, 8, 18);
        // Stand top
        pedGfx.fillStyle(0xB0BEC5, 0.7);
        pedGfx.fillEllipse(0, -10, 54, 10);
        container.add(pedGfx);

        // Emoji (the item)
        var emojiText = scene.add.text(0, -36, items[idx].emoji, {
          fontSize: '52px',
        });
        emojiText.setOrigin(0.5);
        container.add(emojiText);

        // Name label below pedestal
        var nameLabel = scene.add.text(0, 20, items[idx].name, {
          fontSize: '12px',
          fontFamily: 'Nunito, sans-serif',
          fontStyle: 'bold',
          color: '#5D4037',
          align: 'center',
        });
        nameLabel.setOrigin(0.5);
        container.add(nameLabel);

        // Golden glow ring (hidden until pick mode)
        var glowGfx = scene.add.graphics();
        glowGfx.lineStyle(3, 0xFFD700, 0.8);
        glowGfx.strokeCircle(0, -30, 38);
        glowGfx.setAlpha(0);
        container.add(glowGfx);

        scene.itemContainers.push(container);
        scene.itemEmojis.push(emojiText);
        scene.itemLabels.push(nameLabel);
        scene.glowRings.push(glowGfx);

        // Slide up entrance with staggered delay
        scene.tweens.add({
          targets: container,
          y: py,
          duration: 600,
          delay: idx * 150,
          ease: 'Back.easeOut',
        });
      })(i);
    }
  },

  clearItems: function () {
    for (var i = 0; i < this.itemContainers.length; i++) {
      if (this.itemContainers[i]) {
        this.itemContainers[i].destroy();
      }
    }
    this.itemContainers = [];
    this.itemEmojis = [];
    this.itemLabels = [];
    this.glowRings = [];
  },

  // --- Pick Mode ---

  enableSlicing: function () {
    var scene = this;
    this.pickingEnabled = true;

    // Show "Which one is cake?" prompt
    var w = this.scale.width;
    var promptText = this.add.text(w * 0.5, this.counterY + 30, 'Which one is cake? \uD83D\uDD2A', {
      fontSize: '16px',
      fontFamily: 'Fredoka One, Nunito, sans-serif',
      fontStyle: 'bold',
      color: '#E91E63',
      stroke: '#FFFFFF',
      strokeThickness: 3,
    });
    promptText.setOrigin(0.5);
    promptText.setDepth(50);
    this._pickPrompt = promptText;

    // Bounce prompt
    this.tweens.add({
      targets: promptText,
      y: promptText.y - 5,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Activate glow rings and interactivity on non-eliminated items
    for (var i = 0; i < this.itemContainers.length; i++) {
      (function (idx) {
        if (scene.roundItems[idx] && scene.roundItems[idx].eliminated) return;

        var glow = scene.glowRings[idx];
        var container = scene.itemContainers[idx];

        // Show golden glow
        scene.tweens.add({
          targets: glow,
          alpha: 1,
          duration: 300,
        });

        // Pulse animation
        scene.tweens.add({
          targets: container,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // Make container interactive with generous hit area
        container.setSize(80, 100);
        container.setInteractive(
          new Phaser.Geom.Rectangle(-40, -70, 80, 100),
          Phaser.Geom.Rectangle.Contains
        );
        container.on('pointerdown', function () {
          if (!scene.pickingEnabled) return;
          scene.pickingEnabled = false;

          // Remove prompt
          if (scene._pickPrompt) {
            scene._pickPrompt.destroy();
            scene._pickPrompt = null;
          }

          // Stop all pulse tweens
          scene.stopItemPulses();

          // Notify controller
          IsItCake._onItemPicked(idx);
        });
      })(i);
    }
  },

  stopItemPulses: function () {
    for (var i = 0; i < this.itemContainers.length; i++) {
      if (this.itemContainers[i]) {
        this.tweens.killTweensOf(this.itemContainers[i]);
        this.itemContainers[i].setScale(1);
        this.itemContainers[i].removeAllListeners();
        this.itemContainers[i].disableInteractive();
      }
      if (this.glowRings[i]) {
        this.tweens.killTweensOf(this.glowRings[i]);
        this.glowRings[i].setAlpha(0);
      }
    }
  },

  // --- CAKE Reveal Animation ---

  playCakeReveal: function (index, points, callback) {
    var scene = this;
    var container = this.itemContainers[index];
    var emoji = this.itemEmojis[index];
    if (!container || !emoji) { if (callback) callback(); return; }

    var cx = container.x;
    var cy = container.y - 30;
    var w = this.scale.width;
    var h = this.scale.height;

    // 1. Knife drops from top (0-400ms)
    var knife = this.add.text(cx, -40, '\uD83D\uDD2A', { fontSize: '42px' });
    knife.setOrigin(0.5);
    knife.setDepth(60);
    knife.setAngle(-45);

    this.tweens.add({
      targets: knife,
      y: cy,
      angle: 0,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: function () {

        // 2. Contact flash (white circle)
        var flash = scene.add.graphics();
        flash.fillStyle(0xFFFFFF, 0.9);
        flash.fillCircle(cx, cy, 5);
        flash.setDepth(55);

        scene.tweens.add({
          targets: flash,
          scaleX: 12,
          scaleY: 12,
          alpha: 0,
          duration: 300,
          onComplete: function () { flash.destroy(); },
        });

        // 3. Item splits — hide original, show two halves
        emoji.setVisible(false);

        var leftHalf = scene.add.text(cx - 5, cy, emoji.text, { fontSize: '52px' });
        leftHalf.setOrigin(1, 0.5);
        leftHalf.setCrop(0, 0, leftHalf.width / 2, leftHalf.height);
        leftHalf.setDepth(58);

        var rightHalf = scene.add.text(cx + 5, cy, emoji.text, { fontSize: '52px' });
        rightHalf.setOrigin(0, 0.5);
        rightHalf.setCrop(rightHalf.width / 2, 0, rightHalf.width / 2, rightHalf.height);
        rightHalf.setDepth(58);

        // Halves slide apart
        scene.tweens.add({
          targets: leftHalf,
          x: cx - 40,
          angle: -15,
          alpha: 0.6,
          duration: 500,
          ease: 'Quad.easeOut',
          onComplete: function () { leftHalf.destroy(); },
        });

        scene.tweens.add({
          targets: rightHalf,
          x: cx + 40,
          angle: 15,
          alpha: 0.6,
          duration: 500,
          ease: 'Quad.easeOut',
          onComplete: function () { rightHalf.destroy(); },
        });

        // 4. Cake cross-section pops in (600ms)
        scene.time.delayedCall(200, function () {
          var cakeGfx = scene.add.graphics();
          cakeGfx.setDepth(57);

          // Layer colors: chocolate, cream, strawberry, vanilla
          var layers = [
            { color: 0x6D4C41, h: 10 },  // Chocolate
            { color: 0xFFF9C4, h: 8 },   // Cream
            { color: 0xEF9A9A, h: 10 },  // Strawberry
            { color: 0xFFF9C4, h: 8 },   // Cream
            { color: 0xD7CCC8, h: 10 },  // Vanilla
          ];

          var totalH = 0;
          for (var j = 0; j < layers.length; j++) totalH += layers[j].h;

          var startY = cy - totalH / 2;
          var cakeW = 50;

          for (var j = 0; j < layers.length; j++) {
            cakeGfx.fillStyle(layers[j].color, 1);
            cakeGfx.fillRoundedRect(cx - cakeW / 2, startY, cakeW, layers[j].h, 2);
            startY += layers[j].h;
          }

          // Frosting on top
          cakeGfx.fillStyle(0xF48FB1, 1);
          cakeGfx.fillRoundedRect(cx - cakeW / 2 - 3, cy - totalH / 2 - 6, cakeW + 6, 8, 4);

          // Cherry on top!
          cakeGfx.fillStyle(0xC62828, 1);
          cakeGfx.fillCircle(cx, cy - totalH / 2 - 12, 6);
          cakeGfx.lineStyle(2, 0x4CAF50, 1);
          cakeGfx.beginPath();
          cakeGfx.moveTo(cx, cy - totalH / 2 - 18);
          cakeGfx.lineTo(cx + 4, cy - totalH / 2 - 26);
          cakeGfx.strokePath();

          // Bounce in
          cakeGfx.setScale(0);
          scene.tweens.add({
            targets: cakeGfx,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Bounce.easeOut',
          });

          // Fade out cake after a beat
          scene.time.delayedCall(1200, function () {
            scene.tweens.add({
              targets: cakeGfx,
              alpha: 0,
              duration: 400,
              onComplete: function () { cakeGfx.destroy(); },
            });
          });
        });

        // 5. Sprinkle burst (800ms)
        scene.time.delayedCall(400, function () {
          var emitter = scene.add.particles(cx, cy, 'iic_sprinkle', {
            speed: { min: 80, max: 200 },
            angle: { min: 0, max: 360 },
            lifespan: 1000,
            scale: { start: 1.2, end: 0.3 },
            rotate: { min: 0, max: 360 },
            quantity: 30,
            tint: [0xE91E63, 0xFFC107, 0x4CAF50, 0x2196F3, 0x9C27B0, 0xFF5722],
            emitting: false,
          });
          emitter.setDepth(59);
          emitter.explode();
          scene.time.delayedCall(1200, function () { emitter.destroy(); });
        });

        // 6. "CAKE!" text + score (900ms)
        scene.time.delayedCall(500, function () {
          var cakeText = scene.add.text(cx, cy - 60, '\uD83C\uDF82 CAKE!', {
            fontSize: '28px',
            fontFamily: 'Fredoka One, Nunito, sans-serif',
            fontStyle: 'bold',
            color: '#E91E63',
            stroke: '#FFFFFF',
            strokeThickness: 4,
          });
          cakeText.setOrigin(0.5);
          cakeText.setDepth(65);
          cakeText.setScale(0);

          scene.tweens.add({
            targets: cakeText,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Bounce.easeOut',
          });

          scene.tweens.add({
            targets: cakeText,
            y: cakeText.y - 30,
            alpha: 0,
            duration: 800,
            delay: 800,
            ease: 'Quad.easeOut',
            onComplete: function () { cakeText.destroy(); },
          });

          // Score float
          var scoreText = scene.add.text(cx, cy + 20, '+' + points, {
            fontSize: '22px',
            fontFamily: 'Fredoka One, Nunito, sans-serif',
            fontStyle: 'bold',
            color: '#FFD700',
            stroke: '#5D4037',
            strokeThickness: 3,
          });
          scoreText.setOrigin(0.5);
          scoreText.setDepth(65);

          scene.tweens.add({
            targets: scoreText,
            y: scoreText.y - 40,
            alpha: 0,
            duration: 1000,
            ease: 'Quad.easeOut',
            onComplete: function () { scoreText.destroy(); },
          });
        });

        // 7. Confetti rain from multiple points
        scene.time.delayedCall(600, function () {
          for (var ci = 0; ci < 3; ci++) {
            (function (idx) {
              scene.time.delayedCall(idx * 200, function () {
                var confX = w * 0.2 + Math.random() * w * 0.6;
                var confetti = scene.add.particles(confX, -10, 'iic_confetti', {
                  speed: { min: 50, max: 130 },
                  angle: { min: 70, max: 110 },
                  lifespan: 1800,
                  scale: { start: 0.6, end: 0.2 },
                  quantity: 15,
                  tint: [0xE91E63, 0xFFC107, 0x4CAF50, 0x2196F3, 0x9C27B0],
                  emitting: false,
                });
                confetti.setDepth(70);
                confetti.explode();
                scene.time.delayedCall(2000, function () { confetti.destroy(); });
              });
            })(ci);
          }
        });

        // 8. Knife spins off
        scene.tweens.add({
          targets: knife,
          x: cx + 80,
          y: cy - 80,
          angle: 720,
          alpha: 0,
          duration: 800,
          delay: 300,
          ease: 'Quad.easeOut',
          onComplete: function () { knife.destroy(); },
        });

        // 9. Callback after ~2s
        scene.time.delayedCall(2000, function () {
          scene.clearItems();
          if (callback) callback();
        });
      },
    });
  },

  // --- NOT CAKE Animation ---

  playNotCakeReveal: function (index, callback) {
    var scene = this;
    var container = this.itemContainers[index];
    var emoji = this.itemEmojis[index];
    if (!container || !emoji) { if (callback) callback(); return; }

    var cx = container.x;
    var cy = container.y - 30;

    // 1. Knife drops
    var knife = this.add.text(cx, -40, '\uD83D\uDD2A', { fontSize: '42px' });
    knife.setOrigin(0.5);
    knife.setDepth(60);
    knife.setAngle(-45);

    this.tweens.add({
      targets: knife,
      y: cy,
      angle: 0,
      duration: 350,
      ease: 'Quad.easeIn',
      onComplete: function () {

        // 2. Bounces off with wobble
        scene.tweens.add({
          targets: knife,
          y: cy - 60,
          x: cx + 30,
          angle: 45,
          duration: 400,
          ease: 'Bounce.easeOut',
          onComplete: function () {
            scene.tweens.add({
              targets: knife,
              alpha: 0,
              duration: 200,
              onComplete: function () { knife.destroy(); },
            });
          },
        });

        // Screen shake (subtle)
        scene.cameras.main.shake(200, 0.008);

        // Spark particles at impact
        var sparks = scene.add.particles(cx, cy, 'iic_spark', {
          speed: { min: 60, max: 150 },
          angle: { min: 200, max: 340 },
          lifespan: 500,
          scale: { start: 0.8, end: 0 },
          quantity: 8,
          tint: [0xFFD700, 0xFF6F00, 0xFFFFFF],
          emitting: false,
        });
        sparks.setDepth(61);
        sparks.explode();
        scene.time.delayedCall(600, function () { sparks.destroy(); });

        // 3. "NOT CAKE!" text
        var notCakeText = scene.add.text(cx, cy - 50, '\u274C NOT CAKE!', {
          fontSize: '22px',
          fontFamily: 'Fredoka One, Nunito, sans-serif',
          fontStyle: 'bold',
          color: '#F44336',
          stroke: '#FFFFFF',
          strokeThickness: 3,
        });
        notCakeText.setOrigin(0.5);
        notCakeText.setDepth(65);
        notCakeText.setScale(0);

        scene.tweens.add({
          targets: notCakeText,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Bounce.easeOut',
        });

        scene.tweens.add({
          targets: notCakeText,
          y: notCakeText.y - 20,
          alpha: 0,
          duration: 600,
          delay: 600,
          onComplete: function () { notCakeText.destroy(); },
        });

        // 4. Item dims + red X overlay
        scene.tweens.add({
          targets: container,
          alpha: 0.35,
          duration: 400,
        });

        // Red X over eliminated item
        var redX = scene.add.text(cx, cy, '\u274C', { fontSize: '36px' });
        redX.setOrigin(0.5);
        redX.setDepth(62);
        redX.setAlpha(0);

        scene.tweens.add({
          targets: redX,
          alpha: 0.7,
          duration: 300,
          delay: 200,
        });

        // Callback after ~1.2s
        scene.time.delayedCall(1200, function () {
          if (callback) callback();
        });
      },
    });
  },

  // --- Auto-Reveal (last item) ---

  playAutoReveal: function (index, callback) {
    var scene = this;
    var container = this.itemContainers[index];
    var emoji = this.itemEmojis[index];
    if (!container || !emoji) { if (callback) callback(); return; }

    var cx = container.x;
    var cy = container.y - 30;

    // Gentle glow reveal instead of knife
    var glowGfx = this.add.graphics();
    glowGfx.fillStyle(0xFFD700, 0.3);
    glowGfx.fillCircle(cx, cy, 5);
    glowGfx.setDepth(55);

    this.tweens.add({
      targets: glowGfx,
      scaleX: 10,
      scaleY: 10,
      alpha: 0,
      duration: 600,
      onComplete: function () { glowGfx.destroy(); },
    });

    // "It was CAKE!" text
    var revealText = this.add.text(cx, cy - 50, '\uD83C\uDF82 It was cake!', {
      fontSize: '20px',
      fontFamily: 'Fredoka One, Nunito, sans-serif',
      fontStyle: 'bold',
      color: '#FF9800',
      stroke: '#FFFFFF',
      strokeThickness: 3,
    });
    revealText.setOrigin(0.5);
    revealText.setDepth(65);
    revealText.setScale(0);

    this.tweens.add({
      targets: revealText,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Bounce.easeOut',
    });

    // Score float (+1)
    var scoreText = this.add.text(cx, cy + 20, '+1', {
      fontSize: '18px',
      fontFamily: 'Fredoka One, Nunito, sans-serif',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#5D4037',
      strokeThickness: 3,
    });
    scoreText.setOrigin(0.5);
    scoreText.setDepth(65);

    this.tweens.add({
      targets: scoreText,
      y: scoreText.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: function () { scoreText.destroy(); },
    });

    // Small sprinkle burst
    var emitter = this.add.particles(cx, cy, 'iic_sprinkle', {
      speed: { min: 40, max: 100 },
      angle: { min: 0, max: 360 },
      lifespan: 800,
      scale: { start: 0.8, end: 0.2 },
      quantity: 12,
      tint: [0xFFC107, 0xFF9800, 0xFFD700],
      emitting: false,
    });
    emitter.setDepth(59);
    emitter.explode();
    this.time.delayedCall(1000, function () { emitter.destroy(); });

    // Callback after 1.5s
    this.time.delayedCall(1500, function () {
      revealText.destroy();
      scene.clearItems();
      if (callback) callback();
    });
  },

  // --- Letter Progress ---

  onLetterCorrect: function () {
    // Subtle bounce on all items
    for (var i = 0; i < this.itemContainers.length; i++) {
      if (this.itemContainers[i] && (!this.roundItems[i] || !this.roundItems[i].eliminated)) {
        this.tweens.add({
          targets: this.itemContainers[i],
          y: this.itemContainers[i].y - 3,
          duration: 100,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      }
    }
  },

  // --- Victory Animation ---

  showVictoryAnimation: function () {
    var w = this.scale.width;
    var h = this.scale.height;
    var scene = this;

    // Big confetti burst
    for (var i = 0; i < 4; i++) {
      (function (idx) {
        scene.time.delayedCall(idx * 250, function () {
          var x = w * 0.15 + Math.random() * w * 0.7;
          var emitter = scene.add.particles(x, -10, 'iic_confetti', {
            speed: { min: 50, max: 160 },
            angle: { min: 70, max: 110 },
            lifespan: 2200,
            scale: { start: 0.7, end: 0.2 },
            quantity: 25,
            tint: [0xE91E63, 0xFFC107, 0x4CAF50, 0x2196F3, 0x9C27B0],
            emitting: false,
          });
          emitter.setDepth(80);
          emitter.explode();
          scene.time.delayedCall(2500, function () { emitter.destroy(); });
        });
      })(i);
    }

    // Sprinkle rain
    scene.time.delayedCall(500, function () {
      var rainEmitter = scene.add.particles(w / 2, -10, 'iic_sprinkle', {
        speed: { min: 20, max: 60 },
        angle: { min: 80, max: 100 },
        lifespan: 3000,
        scale: { start: 0.5, end: 0.2 },
        rotate: { min: 0, max: 360 },
        quantity: 3,
        frequency: 100,
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(-w / 2, 0, w, 1),
        },
        tint: [0xE91E63, 0xFFC107, 0x4CAF50, 0x2196F3, 0x9C27B0, 0xFF5722],
      });
      rainEmitter.setDepth(75);

      scene.time.delayedCall(3000, function () {
        rainEmitter.stop();
        scene.time.delayedCall(3000, function () { rainEmitter.destroy(); });
      });
    });
  },

  // --- Easter Eggs ---

  startEasterEggs: function () {
    this.easterEggActive = false;
    this.scheduleNextEasterEgg();
  },

  scheduleNextEasterEgg: function () {
    var delay = 15000 + Math.random() * 20000; // 15-35s
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
    if (roll < 35) {
      this.eggMouse();
    } else if (roll < 65) {
      this.eggSteam();
    } else {
      this.eggCrumbs();
    }
  },

  // Tiny mouse scurrying across bakery floor
  eggMouse: function () {
    var scene = this;
    var w = this.scale.width;
    var mouseY = this.groundY - 5;

    var mouse = this.add.container(-20, mouseY);
    mouse.setDepth(8);

    var gfx = this.add.graphics();
    // Body
    gfx.fillStyle(0x9E9E9E, 1);
    gfx.fillEllipse(0, 0, 12, 7);
    // Head
    gfx.fillCircle(8, -2, 5);
    // Ears
    gfx.fillStyle(0xF48FB1, 0.8);
    gfx.fillCircle(5, -6, 3);
    gfx.fillCircle(10, -5, 3);
    // Eye
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(10, -3, 1);
    // Tail
    gfx.lineStyle(2, 0xBDBDBD, 0.8);
    gfx.beginPath();
    gfx.moveTo(-10, 0);
    gfx.lineTo(-18, -5);
    gfx.lineTo(-22, 2);
    gfx.strokePath();

    mouse.add(gfx);

    // Scurry across
    this.tweens.add({
      targets: mouse,
      x: w + 30,
      duration: 2500,
      ease: 'Linear',
      onComplete: function () {
        mouse.destroy();
        scene.easterEggActive = false;
      },
    });

    // Quick little hops
    this.tweens.add({
      targets: mouse,
      y: mouseY - 5,
      duration: 100,
      yoyo: true,
      repeat: 12,
      ease: 'Quad.easeOut',
    });
  },

  // Steam rising from oven area
  eggSteam: function () {
    var scene = this;
    var w = this.scale.width;
    var ox = w * 0.9;
    var oy = this.counterY + this.scale.height * 0.1;

    // Create small steam puffs
    for (var i = 0; i < 4; i++) {
      (function (idx) {
        scene.time.delayedCall(idx * 300, function () {
          var steamGfx = scene.add.graphics();
          steamGfx.fillStyle(0xFFFFFF, 0.4);
          steamGfx.fillCircle(0, 0, 6 + idx * 2);
          steamGfx.setPosition(ox + (Math.random() - 0.5) * 15, oy);
          steamGfx.setDepth(10);

          scene.tweens.add({
            targets: steamGfx,
            y: oy - 60 - idx * 15,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 1500,
            ease: 'Quad.easeOut',
            onComplete: function () { steamGfx.destroy(); },
          });
        });
      })(i);
    }

    this.time.delayedCall(2500, function () {
      scene.easterEggActive = false;
    });
  },

  // Crumb trail on counter
  eggCrumbs: function () {
    var scene = this;
    var w = this.scale.width;
    var startX = w * 0.2 + Math.random() * w * 0.5;
    var crumbY = this.counterY - 5;

    for (var i = 0; i < 5; i++) {
      (function (idx) {
        scene.time.delayedCall(idx * 200, function () {
          var crumb = scene.add.graphics();
          crumb.fillStyle(0xD7CCC8, 0.7);
          crumb.fillCircle(0, 0, 2 + Math.random() * 2);
          crumb.setPosition(startX + idx * 15 + (Math.random() - 0.5) * 8, crumbY);
          crumb.setDepth(7);
          crumb.setAlpha(0);

          scene.tweens.add({
            targets: crumb,
            alpha: 0.7,
            duration: 200,
          });

          // Fade away
          scene.tweens.add({
            targets: crumb,
            alpha: 0,
            duration: 500,
            delay: 2000,
            onComplete: function () { crumb.destroy(); },
          });
        });
      })(i);
    }

    this.time.delayedCall(3500, function () {
      scene.easterEggActive = false;
    });
  },

  // --- Cleanup ---

  shutdown: function () {
    this.clearItems();
    if (this._pickPrompt) {
      this._pickPrompt.destroy();
      this._pickPrompt = null;
    }
  },
});
