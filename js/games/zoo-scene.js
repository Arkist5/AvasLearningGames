/**
 * Zoo Bedtime Scene - Phaser 3 Scene with all game visuals.
 * Rotating habitats, gate with stars, animal animations.
 *
 * All art is drawn with Phaser Graphics API (zero external assets).
 */

var ZooScene = new Phaser.Class({

  Extends: Phaser.Scene,

  initialize: function ZooScene() {
    Phaser.Scene.call(this, { key: 'ZooScene' });

    // Scene objects
    this.habitatBg = null;
    this.habitatElements = null;
    this.gateGroup = null;
    this.gateStars = [];
    this.gateDoors = null;
    this.animalContainer = null;
    this.timerBar = null;
    this.timerBarBg = null;

    // Current state
    this.currentAnimal = null;
    this.currentWordLength = 0;
    this.litStars = 0;
    this.gateOpen = false;

    // Moon animation
    this.moonGlow = null;
    this.moonTime = 0;
  },

  create: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    // Default night sky background (will be covered by habitat)
    this.drawNightSky(w, h);

    // Create habitat container (will be populated per animal)
    this.habitatBg = this.add.container(0, 0);
    this.habitatBg.setDepth(1);

    // Create habitat element container
    this.habitatElements = this.add.container(0, 0);
    this.habitatElements.setDepth(2);

    // Create gate group
    this.gateGroup = this.add.container(w * 0.5, h * 0.45);
    this.gateGroup.setDepth(5);

    // Create animal container
    this.animalContainer = this.add.container(w * 0.5, h * 0.65);
    this.animalContainer.setDepth(10);

    // Timer bar
    this.createTimerBar(w);

    // Create particle textures
    this.createParticleTextures();

    // Notify ZooBedtime that scene is ready
    if (typeof ZooBedtime !== 'undefined' && ZooBedtime._pendingInit) {
      ZooBedtime._pendingInit(this);
      ZooBedtime._pendingInit = null;
    }
  },

  update: function (time, delta) {
    // Moon glow flicker
    this.moonTime += delta * 0.002;
    if (this.moonGlow) {
      this.moonGlow.alpha = 0.2 + Math.sin(this.moonTime) * 0.05;
    }
  },

  // --- Night Sky Background ---

  drawNightSky: function (w, h) {
    var gfx = this.add.graphics();
    gfx.setDepth(0);

    // Dark blue gradient
    var steps = 20;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      // #1a1a2e -> #16213e
      var r = Math.round(26 - t * 10);
      var g = Math.round(26 - t * 5);
      var b = Math.round(46 + t * 16);
      var color = (r << 16) | (g << 8) | b;
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, (h * i) / steps, w, h / steps + 1);
    }

    // Stars scattered
    gfx.fillStyle(0xFFFFFF, 0.8);
    for (var s = 0; s < 30; s++) {
      var sx = Math.random() * w;
      var sy = Math.random() * (h * 0.4);
      var sr = 1 + Math.random() * 1.5;
      gfx.fillCircle(sx, sy, sr);
    }

    // Moon
    var moonX = w * 0.85;
    var moonY = h * 0.12;
    this.moonGlow = this.add.graphics();
    this.moonGlow.fillStyle(0xFFF9C4, 1);
    this.moonGlow.fillCircle(moonX, moonY, 40);
    this.moonGlow.alpha = 0.2;
    this.moonGlow.setDepth(0);

    gfx.fillStyle(0xFFF9C4, 1);
    gfx.fillCircle(moonX, moonY, 20);
    // Crescent shadow
    gfx.fillStyle(0x16213e, 1);
    gfx.fillCircle(moonX + 6, moonY - 2, 16);
  },

  // --- Timer Bar ---

  createTimerBar: function (w) {
    this.timerBarBg = this.add.graphics();
    this.timerBarBg.fillStyle(0x000000, 0.3);
    this.timerBarBg.fillRoundedRect(w * 0.1, 8, w * 0.8, 8, 4);

    this.timerBar = this.add.graphics();
    this.timerBar.setDepth(100);
    this.timerBarBg.setDepth(99);

    // Start hidden
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

  // --- Particle Textures ---

  createParticleTextures: function () {
    // Sparkle particle
    var sparkGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sparkGfx.fillStyle(0xFFD700, 1);
    sparkGfx.fillCircle(4, 4, 4);
    sparkGfx.generateTexture('zoo_sparkle', 8, 8);
    sparkGfx.destroy();

    // Star particle
    var starGfx = this.make.graphics({ x: 0, y: 0, add: false });
    starGfx.fillStyle(0xFFF59D, 1);
    starGfx.fillCircle(3, 3, 3);
    starGfx.generateTexture('zoo_star', 6, 6);
    starGfx.destroy();
  },

  // --- Show Animal with Habitat ---

  showAnimal: function (animalData, wordLength) {
    var w = this.scale.width;
    var h = this.scale.height;
    var scene = this;

    this.currentAnimal = animalData;
    this.currentWordLength = wordLength;
    this.litStars = 0;
    this.gateOpen = false;

    // Clear previous habitat
    this.habitatBg.removeAll(true);
    this.habitatElements.removeAll(true);

    // Draw new habitat background
    this.drawHabitat(animalData, w, h);

    // Build gate with stars
    this.buildGate(wordLength, w, h);

    // Show animal outside gate
    this.showAnimalSprite(animalData);
  },

  // --- Habitat Drawing ---

  drawHabitat: function (animal, w, h) {
    var gfx = this.add.graphics();

    // Main background color
    gfx.fillStyle(animal.bgColor, 1);
    gfx.fillRect(0, 0, w, h * 0.6);

    // Ground
    gfx.fillStyle(animal.groundColor, 1);
    gfx.fillRect(0, h * 0.55, w, h * 0.45);

    this.habitatBg.add(gfx);

    // Habitat-specific elements
    switch (animal.habitat) {
      case 'savanna':
        this.drawSavanna(w, h);
        break;
      case 'ice':
        this.drawIce(w, h);
        break;
      case 'jungle':
        this.drawJungle(w, h);
        break;
      case 'forest':
        this.drawForest(w, h);
        break;
      case 'watering-hole':
        this.drawWateringHole(w, h);
        break;
      case 'tall-trees':
        this.drawTallTrees(w, h);
        break;
      case 'bamboo':
        this.drawBamboo(w, h);
        break;
      case 'aquarium':
        this.drawAquarium(w, h);
        break;
    }
  },

  drawSavanna: function (w, h) {
    var gfx = this.add.graphics();

    // Acacia tree on the right
    gfx.fillStyle(0x5D4037, 1);
    gfx.fillRect(w * 0.8 - 8, h * 0.25, 16, h * 0.35);

    // Tree canopy (flat umbrella shape)
    gfx.fillStyle(0x6D7A1F, 1);
    gfx.beginPath();
    gfx.moveTo(w * 0.6, h * 0.28);
    gfx.lineTo(w * 0.95, h * 0.28);
    gfx.lineTo(w * 0.85, h * 0.18);
    gfx.lineTo(w * 0.7, h * 0.18);
    gfx.closePath();
    gfx.fillPath();

    // Tall grass patches
    gfx.fillStyle(0x9E9D24, 0.6);
    for (var i = 0; i < 8; i++) {
      var gx = w * 0.1 + i * w * 0.1;
      var gy = h * 0.55;
      gfx.fillRect(gx, gy - 15, 4, 20);
      gfx.fillRect(gx + 6, gy - 10, 3, 15);
    }

    this.habitatElements.add(gfx);
  },

  drawIce: function (w, h) {
    var gfx = this.add.graphics();

    // Ice formations
    gfx.fillStyle(0xE8F4F8, 1);
    gfx.beginPath();
    gfx.moveTo(w * 0.1, h * 0.55);
    gfx.lineTo(w * 0.15, h * 0.35);
    gfx.lineTo(w * 0.2, h * 0.55);
    gfx.closePath();
    gfx.fillPath();

    gfx.beginPath();
    gfx.moveTo(w * 0.75, h * 0.55);
    gfx.lineTo(w * 0.82, h * 0.3);
    gfx.lineTo(w * 0.9, h * 0.55);
    gfx.closePath();
    gfx.fillPath();

    // Snowflakes
    gfx.fillStyle(0xFFFFFF, 0.7);
    for (var i = 0; i < 12; i++) {
      var sx = Math.random() * w;
      var sy = Math.random() * h * 0.5;
      gfx.fillCircle(sx, sy, 2);
    }

    this.habitatElements.add(gfx);
  },

  drawJungle: function (w, h) {
    var gfx = this.add.graphics();

    // Vines hanging down
    gfx.lineStyle(4, 0x2E7D32, 1);
    for (var v = 0; v < 4; v++) {
      var vx = w * 0.2 + v * w * 0.2;
      gfx.beginPath();
      gfx.moveTo(vx, 0);
      gfx.lineTo(vx + 10, h * 0.15);
      gfx.lineTo(vx - 5, h * 0.25);
      gfx.lineTo(vx + 8, h * 0.35);
      gfx.strokePath();
    }

    // Large leaves
    gfx.fillStyle(0x4CAF50, 0.8);
    this.drawLeaf(gfx, w * 0.1, h * 0.15, 30);
    this.drawLeaf(gfx, w * 0.85, h * 0.2, -25);

    // Tropical flowers
    gfx.fillStyle(0xE91E63, 1);
    gfx.fillCircle(w * 0.15, h * 0.3, 6);
    gfx.fillCircle(w * 0.88, h * 0.35, 5);
    gfx.fillStyle(0xFFEB3B, 1);
    gfx.fillCircle(w * 0.15, h * 0.3, 2);
    gfx.fillCircle(w * 0.88, h * 0.35, 2);

    this.habitatElements.add(gfx);
  },

  drawLeaf: function (gfx, x, y, angle) {
    // Simple leaf shape
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x + Math.cos(angle * Math.PI / 180) * 40, y + Math.sin(angle * Math.PI / 180) * 20);
    gfx.lineTo(x + Math.cos(angle * Math.PI / 180) * 50, y + Math.sin(angle * Math.PI / 180) * 10);
    gfx.lineTo(x + Math.cos(angle * Math.PI / 180) * 40, y);
    gfx.closePath();
    gfx.fillPath();
  },

  drawForest: function (w, h) {
    var gfx = this.add.graphics();

    // Pine trees in background
    gfx.fillStyle(0x2E7D32, 0.6);
    this.drawPineTree(gfx, w * 0.1, h * 0.55, 0.7);
    this.drawPineTree(gfx, w * 0.85, h * 0.55, 0.8);

    // Cave entrance (dark opening behind gate)
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillEllipse(w * 0.5, h * 0.42, 80, 50);

    // Rocks around cave
    gfx.fillStyle(0x757575, 1);
    gfx.fillCircle(w * 0.35, h * 0.5, 15);
    gfx.fillCircle(w * 0.65, h * 0.48, 18);
    gfx.fillCircle(w * 0.42, h * 0.52, 10);

    this.habitatElements.add(gfx);
  },

  drawPineTree: function (gfx, x, y, scale) {
    // Trunk
    gfx.fillStyle(0x5D4037, 1);
    gfx.fillRect(x - 5 * scale, y - 20 * scale, 10 * scale, 25 * scale);

    // Layers of pine
    gfx.fillStyle(0x2E7D32, 1);
    for (var i = 0; i < 3; i++) {
      var layerY = y - 25 * scale - i * 25 * scale;
      var layerW = (45 - i * 10) * scale;
      gfx.beginPath();
      gfx.moveTo(x - layerW / 2, layerY);
      gfx.lineTo(x, layerY - 30 * scale);
      gfx.lineTo(x + layerW / 2, layerY);
      gfx.closePath();
      gfx.fillPath();
    }
  },

  drawWateringHole: function (w, h) {
    var gfx = this.add.graphics();

    // Water pool
    gfx.fillStyle(0x64B5F6, 0.8);
    gfx.fillEllipse(w * 0.5, h * 0.52, 100, 30);

    // Water ripples
    gfx.lineStyle(2, 0x90CAF9, 0.5);
    gfx.strokeEllipse(w * 0.5, h * 0.52, 60, 18);
    gfx.strokeEllipse(w * 0.5, h * 0.52, 80, 24);

    // Mud patches
    gfx.fillStyle(0x8D6E63, 0.6);
    gfx.fillCircle(w * 0.3, h * 0.55, 20);
    gfx.fillCircle(w * 0.7, h * 0.54, 15);

    // Grass tufts
    gfx.fillStyle(0x7CB342, 1);
    for (var i = 0; i < 6; i++) {
      var gx = w * 0.15 + i * w * 0.14;
      gfx.fillRect(gx, h * 0.53, 3, -12);
      gfx.fillRect(gx + 4, h * 0.53, 2, -8);
    }

    this.habitatElements.add(gfx);
  },

  drawTallTrees: function (w, h) {
    var gfx = this.add.graphics();

    // Very tall acacia-like trees
    gfx.fillStyle(0x5D4037, 1);
    gfx.fillRect(w * 0.15 - 6, h * 0.1, 12, h * 0.5);
    gfx.fillRect(w * 0.8 - 8, h * 0.05, 16, h * 0.55);

    // Tree tops (high up)
    gfx.fillStyle(0x7CB342, 1);
    gfx.fillEllipse(w * 0.15, h * 0.08, 50, 25);
    gfx.fillEllipse(w * 0.8, h * 0.05, 60, 30);

    // Clouds
    gfx.fillStyle(0xFFFFFF, 0.4);
    gfx.fillEllipse(w * 0.3, h * 0.12, 40, 15);
    gfx.fillEllipse(w * 0.6, h * 0.08, 50, 18);

    this.habitatElements.add(gfx);
  },

  drawBamboo: function (w, h) {
    var gfx = this.add.graphics();

    // Bamboo stalks
    gfx.fillStyle(0x8BC34A, 1);
    for (var b = 0; b < 8; b++) {
      var bx = w * 0.08 + b * w * 0.06;
      var bh = 80 + Math.random() * 60;

      // Stalk
      gfx.fillRect(bx, h * 0.55 - bh, 8, bh);

      // Segments (dark bands)
      gfx.fillStyle(0x689F38, 1);
      for (var s = 0; s < bh / 20; s++) {
        gfx.fillRect(bx, h * 0.55 - bh + s * 20, 8, 3);
      }
      gfx.fillStyle(0x8BC34A, 1);
    }

    // More bamboo on right
    for (var b = 0; b < 6; b++) {
      var bx = w * 0.7 + b * w * 0.05;
      var bh = 70 + Math.random() * 50;
      gfx.fillRect(bx, h * 0.55 - bh, 6, bh);
    }

    this.habitatElements.add(gfx);
  },

  drawAquarium: function (w, h) {
    var gfx = this.add.graphics();

    // Bubbles
    gfx.fillStyle(0xFFFFFF, 0.3);
    for (var b = 0; b < 15; b++) {
      var bx = Math.random() * w;
      var by = Math.random() * h * 0.5 + h * 0.1;
      var br = 3 + Math.random() * 5;
      gfx.fillCircle(bx, by, br);
    }

    // Aquatic plants
    gfx.fillStyle(0x4CAF50, 0.7);
    for (var p = 0; p < 5; p++) {
      var px = w * 0.1 + p * w * 0.2;
      this.drawSeaweed(gfx, px, h * 0.55, 40 + Math.random() * 30);
    }

    // Rocks on bottom
    gfx.fillStyle(0x607D8B, 1);
    gfx.fillEllipse(w * 0.2, h * 0.56, 30, 12);
    gfx.fillEllipse(w * 0.5, h * 0.57, 40, 15);
    gfx.fillEllipse(w * 0.75, h * 0.55, 25, 10);

    this.habitatElements.add(gfx);
  },

  drawSeaweed: function (gfx, x, baseY, height) {
    // Wavy seaweed strands
    gfx.beginPath();
    gfx.moveTo(x, baseY);
    for (var i = 0; i < height; i += 10) {
      var wave = Math.sin(i * 0.2) * 8;
      gfx.lineTo(x + wave, baseY - i);
    }
    gfx.lineTo(x, baseY - height);
    gfx.lineTo(x - 3, baseY);
    gfx.closePath();
    gfx.fillPath();
  },

  // --- Gate Building ---

  buildGate: function (wordLength, w, h) {
    var scene = this;

    // Clear previous gate
    this.gateGroup.removeAll(true);
    this.gateStars = [];
    this.gateDoors = null;

    var gateW = Math.min(w * 0.6, 200);
    var gateH = h * 0.25;

    // Gate frame (wooden)
    var frame = this.add.graphics();
    frame.fillStyle(0x5D4037, 1);

    // Left post
    frame.fillRect(-gateW / 2 - 10, -gateH / 2, 15, gateH);
    // Right post
    frame.fillRect(gateW / 2 - 5, -gateH / 2, 15, gateH);
    // Top beam
    frame.fillRect(-gateW / 2 - 10, -gateH / 2 - 15, gateW + 20, 20);

    // Decorative top arch
    frame.fillStyle(0x795548, 1);
    frame.beginPath();
    frame.moveTo(-gateW / 2, -gateH / 2 - 15);
    frame.lineTo(0, -gateH / 2 - 35);
    frame.lineTo(gateW / 2, -gateH / 2 - 15);
    frame.closePath();
    frame.fillPath();

    this.gateGroup.add(frame);

    // Gate doors (will animate open)
    this.gateDoors = this.add.container(0, 0);

    var leftDoor = this.add.graphics();
    leftDoor.fillStyle(0x8D6E63, 1);
    leftDoor.fillRect(-gateW / 2 + 5, -gateH / 2 + 5, gateW / 2 - 10, gateH - 10);
    // Wood slats
    leftDoor.fillStyle(0x795548, 0.5);
    leftDoor.fillRect(-gateW / 2 + 10, -gateH / 2 + 10, 3, gateH - 20);
    leftDoor.fillRect(-gateW / 4, -gateH / 2 + 10, 3, gateH - 20);

    var rightDoor = this.add.graphics();
    rightDoor.fillStyle(0x8D6E63, 1);
    rightDoor.fillRect(5, -gateH / 2 + 5, gateW / 2 - 10, gateH - 10);
    rightDoor.fillStyle(0x795548, 0.5);
    rightDoor.fillRect(10, -gateH / 2 + 10, 3, gateH - 20);
    rightDoor.fillRect(gateW / 4, -gateH / 2 + 10, 3, gateH - 20);

    this.gateDoors.add([leftDoor, rightDoor]);
    this.gateDoors.leftDoor = leftDoor;
    this.gateDoors.rightDoor = rightDoor;
    this.gateGroup.add(this.gateDoors);

    // Stars along the top
    var starSpacing = gateW / (wordLength + 1);
    var starY = -gateH / 2 - 25;

    for (var i = 0; i < wordLength; i++) {
      var starX = -gateW / 2 + starSpacing * (i + 1);
      var star = this.add.text(starX, starY, '☆', {
        fontSize: '24px',
        color: '#9E9E9E',
      });
      star.setOrigin(0.5, 0.5);
      this.gateStars.push(star);
      this.gateGroup.add(star);
    }

    // Gate entrance animation
    this.gateGroup.alpha = 0;
    this.gateGroup.scaleX = 0.8;
    this.gateGroup.scaleY = 0.8;

    this.tweens.add({
      targets: this.gateGroup,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
  },

  // --- Animal Sprite ---

  showAnimalSprite: function (animal) {
    var scene = this;

    // Clear previous
    this.animalContainer.removeAll(true);

    // Large emoji for the animal
    var animalText = this.add.text(0, 0, animal.emoji, {
      fontSize: '64px',
    });
    animalText.setOrigin(0.5, 0.5);

    this.animalContainer.add(animalText);
    this.animalContainer.animalText = animalText;

    // Entrance animation (hop in from below)
    this.animalContainer.y = this.scale.height + 50;
    this.animalContainer.alpha = 0;

    this.tweens.add({
      targets: this.animalContainer,
      y: this.scale.height * 0.65,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Idle bounce animation
    this.tweens.add({
      targets: animalText,
      y: -5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  },

  // --- Star Lighting ---

  lightStar: function (position) {
    if (position >= this.gateStars.length) return;

    var star = this.gateStars[position];
    star.setText('⭐');

    // Pop animation
    this.tweens.add({
      targets: star,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // Sparkle burst
    var sparkEmitter = this.add.particles(
      this.gateGroup.x + star.x,
      this.gateGroup.y + star.y,
      'zoo_sparkle',
      {
        speed: { min: 20, max: 50 },
        angle: { min: 0, max: 360 },
        lifespan: 400,
        scale: { start: 0.5, end: 0 },
        quantity: 5,
        tint: [0xFFD700, 0xFFF9C4],
        emitting: false,
      }
    );
    sparkEmitter.setDepth(20);
    sparkEmitter.explode();
    this.time.delayedCall(500, function () { sparkEmitter.destroy(); });

    this.litStars++;
  },

  // --- Animal Reactions ---

  animalReact: function (type) {
    if (!this.animalContainer || !this.animalContainer.animalText) return;

    var animal = this.animalContainer.animalText;

    if (type === 'happy') {
      // Excited bounce
      this.tweens.add({
        targets: this.animalContainer,
        y: this.animalContainer.y - 15,
        duration: 150,
        yoyo: true,
        ease: 'Power2',
      });
    } else if (type === 'worried') {
      // Shake
      this.tweens.add({
        targets: this.animalContainer,
        x: this.animalContainer.x - 8,
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: 'Linear',
        onComplete: function () {
          this.animalContainer.x = this.scale.width * 0.5;
        }.bind(this),
      });
    }
  },

  // --- Gate Shake (wrong letter) ---

  shakeGate: function () {
    if (!this.gateGroup) return;

    var originalX = this.scale.width * 0.5;

    this.tweens.add({
      targets: this.gateGroup,
      x: originalX - 8,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Linear',
      onComplete: function () {
        this.gateGroup.x = originalX;
      }.bind(this),
    });
  },

  // --- Gate Opening ---

  openGate: function (callback) {
    if (this.gateOpen) {
      if (callback) callback();
      return;
    }
    this.gateOpen = true;

    var scene = this;
    var w = this.scale.width;
    var h = this.scale.height;

    // Swing doors open
    if (this.gateDoors) {
      this.tweens.add({
        targets: this.gateDoors.leftDoor,
        x: -60,
        alpha: 0.3,
        duration: 600,
        ease: 'Power2',
      });
      this.tweens.add({
        targets: this.gateDoors.rightDoor,
        x: 60,
        alpha: 0.3,
        duration: 600,
        ease: 'Power2',
      });
    }

    // Animal walks through gate
    this.time.delayedCall(400, function () {
      scene.tweens.add({
        targets: scene.animalContainer,
        y: scene.gateGroup.y,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 600,
        ease: 'Power2',
        onComplete: function () {
          // Celebration inside
          scene.celebrateAnimal(callback);
        },
      });
    });
  },

  celebrateAnimal: function (callback) {
    var scene = this;

    // Jump/dance animation
    this.tweens.add({
      targets: this.animalContainer,
      y: this.animalContainer.y - 30,
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: 'Power2',
    });

    // Big sparkle celebration
    var sparkEmitter = this.add.particles(
      this.animalContainer.x,
      this.animalContainer.y,
      'zoo_sparkle',
      {
        speed: { min: 50, max: 120 },
        angle: { min: 0, max: 360 },
        lifespan: 800,
        scale: { start: 0.8, end: 0 },
        quantity: 20,
        tint: [0xFFD700, 0xFFF9C4, 0xFF69B4, 0x00E676],
        emitting: false,
      }
    );
    sparkEmitter.setDepth(25);
    sparkEmitter.explode();

    // Fade out animal into habitat
    this.time.delayedCall(800, function () {
      scene.tweens.add({
        targets: scene.animalContainer,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 400,
        ease: 'Power2',
        onComplete: function () {
          sparkEmitter.destroy();
          if (callback) callback();
        },
      });
    });
  },

  // --- Sad Animal (timeout) ---

  showSadAnimal: function (callback) {
    var scene = this;

    if (!this.animalContainer) {
      if (callback) callback();
      return;
    }

    // Droop down
    this.tweens.add({
      targets: this.animalContainer,
      y: this.animalContainer.y + 20,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 400,
      ease: 'Power2',
    });

    // Shake head (rotation wobble)
    this.tweens.add({
      targets: this.animalContainer,
      angle: -10,
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: function () {
        scene.animalContainer.angle = 0;
      },
    });

    // Fade out
    this.time.delayedCall(1500, function () {
      scene.tweens.add({
        targets: scene.animalContainer,
        alpha: 0,
        y: scene.animalContainer.y + 40,
        duration: 400,
        ease: 'Power2',
        onComplete: function () {
          if (callback) callback();
        },
      });

      // Gate fades too
      scene.tweens.add({
        targets: scene.gateGroup,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
      });
    });
  },

  // --- Cleanup ---

  shutdown: function () {
    this.gateStars = [];
    if (this.habitatBg) {
      this.habitatBg.removeAll(true);
    }
    if (this.habitatElements) {
      this.habitatElements.removeAll(true);
    }
    if (this.gateGroup) {
      this.gateGroup.removeAll(true);
    }
    if (this.animalContainer) {
      this.animalContainer.removeAll(true);
    }
  },
});
