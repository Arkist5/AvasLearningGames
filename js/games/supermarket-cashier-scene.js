/**
 * Supermarket Cashier Scene - Phaser 3 Scene with all game visuals.
 * Store interior with conveyor belt, scanner, register, cashier, and customers.
 *
 * All art is drawn with Phaser Graphics API (zero external assets).
 */

var SupermarketCashierScene = new Phaser.Class({

  Extends: Phaser.Scene,

  initialize: function SupermarketCashierScene() {
    Phaser.Scene.call(this, { key: 'SupermarketCashierScene' });

    // Scene objects
    this.conveyorStripes = [];
    this.currentItem = null;
    this.itemContainer = null;
    this.cashierGroup = null;
    this.customerGroup = null;
    this.registerDisplay = null;
    this.scannerGlow = null;
    this.itemIndex = 0;

    // Animation state
    this.conveyorTime = 0;
    this.scannerPulse = 0;
    this.timerBar = null;
    this.timerBarBg = null;
    this.easterEggActive = false;

    // Layout
    this.groundY = 0;
    this.conveyorY = 0;
    this.scannerX = 0;
  },

  create: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    // Store interior background
    this.drawBackground(w, h);

    // Conveyor belt
    this.createConveyorBelt(w, h);

    // Scanner area
    this.createScanner(w, h);

    // Cash register
    this.createRegister(w, h);

    // Cashier (Ava)
    this.createCashier(w, h);

    // Customer area
    this.createCustomer(w, h);

    // Timer bar (at top of scene)
    this.createTimerBar(w);

    // Start random Easter egg events
    this.startEasterEggs();

    // Notify SupermarketCashier that scene is ready
    if (typeof SupermarketCashier !== 'undefined' && SupermarketCashier._pendingInit) {
      SupermarketCashier._pendingInit(this);
      SupermarketCashier._pendingInit = null;
    }
  },

  update: function (time, delta) {
    // Conveyor belt animation
    this.conveyorTime += delta * 0.05;
    this.updateConveyorStripes();

    // Scanner glow pulse
    this.scannerPulse += delta * 0.004;
    if (this.scannerGlow) {
      var pulse = 0.3 + Math.sin(this.scannerPulse) * 0.15;
      this.scannerGlow.setAlpha(pulse);
    }
  },

  // --- Background ---

  drawBackground: function (w, h) {
    var gfx = this.add.graphics();

    // Store interior - gradient from ceiling to floor
    var steps = 15;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      // Light blue/gray ceiling -> warmer floor
      var r = Math.round(245 - t * 20);
      var g = Math.round(245 - t * 15);
      var b = Math.round(250 - t * 25);
      var color = (r << 16) | (g << 8) | b;
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, (h * i) / steps, w, h / steps + 1);
    }

    // Floor
    this.groundY = h * 0.85;
    gfx.fillStyle(0xd7ccc8, 1);
    gfx.fillRect(0, this.groundY, w, h - this.groundY);

    // Floor tiles pattern
    gfx.fillStyle(0xbcaaa4, 0.4);
    for (var x = 0; x < w; x += 40) {
      gfx.fillRect(x, this.groundY, 2, h - this.groundY);
    }
    for (var y = this.groundY; y < h; y += 30) {
      gfx.fillRect(0, y, w, 2);
    }

    // Store decor (shelves, products, signs)
    this.drawStoreDecor(w, h);

    // Ceiling lights
    this.drawCeilingLights(w, h);
  },

  drawStoreDecor: function (w, h) {
    var gfx = this.add.graphics();
    var shelfY = h * 0.18;
    var shelfHeight = h * 0.28;

    // --- Background shelf unit (left side, behind customer area) ---
    var shelfX = w * 0.02;
    var shelfW = w * 0.22;

    // Shelf back panel
    gfx.fillStyle(0xe8e8e8, 1);
    gfx.fillRect(shelfX, shelfY, shelfW, shelfHeight);

    // Shelf border
    gfx.fillStyle(0x90a4ae, 1);
    gfx.fillRect(shelfX, shelfY, shelfW, 4);
    gfx.fillRect(shelfX, shelfY, 4, shelfHeight);
    gfx.fillRect(shelfX + shelfW - 4, shelfY, 4, shelfHeight);

    // Shelf levels
    var numShelves = 3;
    for (var i = 0; i < numShelves; i++) {
      var levelY = shelfY + (shelfHeight / numShelves) * (i + 1) - 6;
      gfx.fillStyle(0x78909c, 1);
      gfx.fillRect(shelfX + 4, levelY, shelfW - 8, 6);

      // Products on each shelf
      this.drawShelfProducts(gfx, shelfX + 10, levelY - 25, shelfW - 20, i);
    }

    // Aisle sign above shelf
    gfx.fillStyle(0x1976d2, 1);
    gfx.fillRoundedRect(shelfX + shelfW / 2 - 30, shelfY - 22, 60, 20, 4);
    var aisleText = this.add.text(shelfX + shelfW / 2, shelfY - 12, 'AISLE 1', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    aisleText.setOrigin(0.5);

    // --- Produce display (far back, smaller/distant) ---
    var produceX = w * 0.32;
    var produceY = h * 0.22;
    var produceW = w * 0.12;
    var produceH = h * 0.15;

    // Produce bin
    gfx.fillStyle(0x8d6e63, 1);
    gfx.fillRect(produceX, produceY, produceW, produceH);
    gfx.fillStyle(0x6d4c41, 1);
    gfx.fillRect(produceX, produceY, produceW, 5);

    // Colorful produce (apples, oranges, etc)
    var produceColors = [0xe53935, 0xff9800, 0xffeb3b, 0x4caf50];
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 4; col++) {
        var px = produceX + 8 + col * (produceW - 16) / 4;
        var py = produceY + 12 + row * 20;
        gfx.fillStyle(produceColors[(col + row) % produceColors.length], 1);
        gfx.fillCircle(px, py, 7);
      }
    }

    // "FRESH" sign
    var freshSign = this.add.text(produceX + produceW / 2, produceY - 10, 'FRESH!', {
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#4caf50',
      backgroundColor: '#e8f5e9',
      padding: { x: 4, y: 2 },
    });
    freshSign.setOrigin(0.5);

    // --- Sale banner (hanging from ceiling) ---
    var bannerX = w * 0.55;
    var bannerY = h * 0.12;

    gfx.fillStyle(0xe53935, 1);
    gfx.fillRoundedRect(bannerX - 45, bannerY, 90, 28, 6);

    // Banner text
    var saleText = this.add.text(bannerX, bannerY + 14, 'SALE!', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    saleText.setOrigin(0.5);

    // String holding banner
    gfx.lineStyle(2, 0x616161, 1);
    gfx.beginPath();
    gfx.moveTo(bannerX, bannerY);
    gfx.lineTo(bannerX, 0);
    gfx.strokePath();

    // --- Shopping baskets stack (near checkout) ---
    var basketX = w * 0.68;
    var basketY = this.groundY - 35;

    // Stack of red baskets
    for (var b = 0; b < 3; b++) {
      var by = basketY - b * 8;
      gfx.fillStyle(0xc62828, 1);
      gfx.fillRect(basketX, by, 30, 12);
      gfx.fillStyle(0xb71c1c, 1);
      gfx.fillRect(basketX, by, 30, 3);
      // Handle
      gfx.lineStyle(2, 0x424242, 1);
      gfx.beginPath();
      gfx.moveTo(basketX + 5, by);
      gfx.lineTo(basketX + 5, by - 6);
      gfx.lineTo(basketX + 25, by - 6);
      gfx.lineTo(basketX + 25, by);
      gfx.strokePath();
    }

    // --- Potted plant (decorative) ---
    var plantX = w * 0.48;
    var plantY = this.groundY;

    // Pot
    gfx.fillStyle(0x8d6e63, 1);
    gfx.beginPath();
    gfx.moveTo(plantX - 12, plantY);
    gfx.lineTo(plantX - 15, plantY - 25);
    gfx.lineTo(plantX + 15, plantY - 25);
    gfx.lineTo(plantX + 12, plantY);
    gfx.closePath();
    gfx.fillPath();

    // Pot rim
    gfx.fillStyle(0x6d4c41, 1);
    gfx.fillRect(plantX - 16, plantY - 28, 32, 5);

    // Plant leaves
    gfx.fillStyle(0x4caf50, 1);
    gfx.fillEllipse(plantX, plantY - 40, 18, 14);
    gfx.fillEllipse(plantX - 10, plantY - 35, 10, 12);
    gfx.fillEllipse(plantX + 10, plantY - 35, 10, 12);
    gfx.fillStyle(0x66bb6a, 1);
    gfx.fillEllipse(plantX, plantY - 48, 12, 10);
  },

  drawShelfProducts: function (gfx, x, y, width, shelfIndex) {
    // Different products on each shelf level
    var products = [
      // Shelf 0: Cereal boxes
      [
        { color: 0xf44336, w: 14, h: 22 },
        { color: 0x2196f3, w: 14, h: 22 },
        { color: 0xffeb3b, w: 14, h: 22 },
        { color: 0x4caf50, w: 14, h: 22 },
        { color: 0xff9800, w: 14, h: 22 },
      ],
      // Shelf 1: Cans
      [
        { color: 0x9e9e9e, w: 10, h: 16, round: true },
        { color: 0xf44336, w: 10, h: 16, round: true },
        { color: 0x4caf50, w: 10, h: 16, round: true },
        { color: 0x2196f3, w: 10, h: 16, round: true },
        { color: 0xffeb3b, w: 10, h: 16, round: true },
        { color: 0x9c27b0, w: 10, h: 16, round: true },
      ],
      // Shelf 2: Bottles
      [
        { color: 0x4fc3f7, w: 8, h: 20, bottle: true },
        { color: 0xff8a65, w: 8, h: 20, bottle: true },
        { color: 0xce93d8, w: 8, h: 20, bottle: true },
        { color: 0xa5d6a7, w: 8, h: 20, bottle: true },
        { color: 0xffcc80, w: 8, h: 20, bottle: true },
      ],
    ];

    var shelfProducts = products[shelfIndex % products.length];
    var spacing = width / (shelfProducts.length + 1);

    for (var i = 0; i < shelfProducts.length; i++) {
      var p = shelfProducts[i];
      var px = x + spacing * (i + 1) - p.w / 2;
      var py = y;

      gfx.fillStyle(p.color, 1);

      if (p.round) {
        // Can shape
        gfx.fillRoundedRect(px, py, p.w, p.h, 3);
        gfx.fillStyle(0xffffff, 0.3);
        gfx.fillRect(px + 2, py + 3, p.w - 4, 4);
      } else if (p.bottle) {
        // Bottle shape
        gfx.fillRoundedRect(px, py + 5, p.w, p.h - 5, 2);
        gfx.fillRect(px + 2, py, p.w - 4, 8);
        // Cap
        gfx.fillStyle(0x424242, 1);
        gfx.fillRect(px + 2, py - 2, p.w - 4, 3);
      } else {
        // Box shape
        gfx.fillRect(px, py, p.w, p.h);
        // Label stripe
        gfx.fillStyle(0xffffff, 0.4);
        gfx.fillRect(px + 2, py + p.h / 2 - 3, p.w - 4, 6);
      }
    }
  },

  drawCeilingLights: function (w, h) {
    var gfx = this.add.graphics();
    var lightY = h * 0.05;

    for (var i = 0; i < 3; i++) {
      var lightX = w * (0.2 + i * 0.3);

      // Light fixture
      gfx.fillStyle(0x9e9e9e, 1);
      gfx.fillRect(lightX - 25, lightY, 50, 8);

      // Light glow
      gfx.fillStyle(0xfff9c4, 0.3);
      gfx.fillCircle(lightX, lightY + 20, 40);
      gfx.fillStyle(0xfff9c4, 0.5);
      gfx.fillCircle(lightX, lightY + 10, 20);

      // Light panel
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillRect(lightX - 20, lightY + 5, 40, 6);
    }
  },

  // --- Conveyor Belt ---

  createConveyorBelt: function (w, h) {
    this.conveyorY = h * 0.58;
    var beltWidth = w * 0.45; // Shorter belt
    var beltHeight = 12; // Much thinner belt
    var beltX = w * 0.18; // Start more to the right to leave room for customer

    var gfx = this.add.graphics();

    // Belt base (dark)
    gfx.fillStyle(0x37474f, 1);
    gfx.fillRoundedRect(beltX - 5, this.conveyorY - 5, beltWidth + 10, beltHeight + 10, 8);

    // Belt surface (silver)
    gfx.fillStyle(0x78909c, 1);
    gfx.fillRect(beltX, this.conveyorY, beltWidth, beltHeight);

    // Belt edges
    gfx.fillStyle(0x546e7a, 1);
    gfx.fillRect(beltX, this.conveyorY, beltWidth, 4);
    gfx.fillRect(beltX, this.conveyorY + beltHeight - 4, beltWidth, 4);

    // Create animated stripes
    this.conveyorStripes = [];
    var stripeGfx = this.add.graphics();
    stripeGfx.fillStyle(0x607d8b, 1);

    for (var x = 0; x < beltWidth; x += 25) {
      this.conveyorStripes.push({
        baseX: beltX + x,
        x: beltX + x,
      });
    }

    this.conveyorBeltX = beltX;
    this.conveyorBeltWidth = beltWidth;
    this.conveyorBeltHeight = beltHeight;
    this.conveyorStripeGfx = stripeGfx;

    // Legs
    gfx.fillStyle(0x455a64, 1);
    gfx.fillRect(beltX + 15, this.conveyorY + beltHeight, 10, this.groundY - this.conveyorY - beltHeight);
    gfx.fillRect(beltX + beltWidth - 25, this.conveyorY + beltHeight, 10, this.groundY - this.conveyorY - beltHeight);
  },

  updateConveyorStripes: function () {
    if (!this.conveyorStripeGfx) return;
    this.conveyorStripeGfx.clear();
    this.conveyorStripeGfx.fillStyle(0x546e7a, 1);

    var offset = (this.conveyorTime % 25);

    for (var i = 0; i < this.conveyorStripes.length; i++) {
      var stripe = this.conveyorStripes[i];
      var x = stripe.baseX + offset;
      if (x < this.conveyorBeltX + this.conveyorBeltWidth - 5) {
        this.conveyorStripeGfx.fillRect(x, this.conveyorY + 2, 8, this.conveyorBeltHeight - 4);
      }
    }
  },

  // --- Scanner ---

  createScanner: function (w, h) {
    // Scanner at end of the shorter belt
    this.scannerX = this.conveyorBeltX + this.conveyorBeltWidth - 10;
    var scannerY = this.conveyorY - 10;

    var gfx = this.add.graphics();

    // Scanner base
    gfx.fillStyle(0x263238, 1);
    gfx.fillRect(this.scannerX - 30, scannerY, 60, 55);

    // Scanner window (glass)
    gfx.fillStyle(0x90caf9, 0.7);
    gfx.fillRect(this.scannerX - 22, scannerY + 8, 44, 35);

    // Scanner grid lines
    gfx.lineStyle(1, 0x42a5f5, 0.5);
    for (var i = 0; i < 5; i++) {
      gfx.beginPath();
      gfx.moveTo(this.scannerX - 22, scannerY + 8 + i * 8);
      gfx.lineTo(this.scannerX + 22, scannerY + 8 + i * 8);
      gfx.strokePath();
    }

    // Scanner glow (pulsing)
    this.scannerGlow = this.add.graphics();
    this.scannerGlow.fillStyle(0x4fc3f7, 1);
    this.scannerGlow.fillRect(this.scannerX - 20, scannerY + 12, 40, 2);
    this.scannerGlow.fillRect(this.scannerX - 20, scannerY + 22, 40, 2);
    this.scannerGlow.fillRect(this.scannerX - 20, scannerY + 32, 40, 2);
    this.scannerGlow.setDepth(10);

    // "SCAN" label
    gfx.fillStyle(0x4caf50, 1);
    gfx.fillRect(this.scannerX - 18, scannerY + 45, 36, 6);
  },

  // --- Cash Register ---

  createRegister: function (w, h) {
    // Register next to scanner, lowered to be at cashier level
    var regX = this.scannerX + 70;
    var regY = this.conveyorY + 10;

    var gfx = this.add.graphics();

    // Register body
    gfx.fillStyle(0x37474f, 1);
    gfx.fillRoundedRect(regX - 40, regY, 80, 90, 6);

    // Register screen
    gfx.fillStyle(0x1b5e20, 1);
    gfx.fillRect(regX - 32, regY + 8, 64, 30);

    // Screen glow effect
    gfx.fillStyle(0x4caf50, 0.3);
    gfx.fillRect(regX - 30, regY + 10, 60, 26);

    // Keypad buttons
    gfx.fillStyle(0x616161, 1);
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 3; col++) {
        gfx.fillRect(regX - 28 + col * 20, regY + 45 + row * 12, 16, 9);
      }
    }

    // Display text area (updated dynamically)
    this.registerDisplay = this.add.graphics();
    this.registerDisplay.setDepth(15);
    this.updateRegisterDisplay('$0.00');
  },

  updateRegisterDisplay: function (text) {
    if (!this.registerDisplay) return;
    // For now, display is static - could add dynamic text later
  },

  // --- Cashier (Ava) ---

  createCashier: function (w, h) {
    // Cashier stands at floor level to the right of the register
    var cashierX = this.scannerX + 180;
    var cashierY = this.groundY - 70;

    this.cashierGroup = this.add.container(cashierX, cashierY);
    this.cashierGroup.setDepth(20);
    this.cashierGroup.setScale(2.5); // Make Ava much bigger

    var gfx = this.add.graphics();

    // Skin color for Black Ava
    var skinColor = 0x8B4513;

    // Body (blue apron)
    gfx.fillStyle(0x1976d2, 1);
    gfx.beginPath();
    gfx.moveTo(-15, 0);
    gfx.lineTo(-20, 40);
    gfx.lineTo(20, 40);
    gfx.lineTo(15, 0);
    gfx.closePath();
    gfx.fillPath();

    // Apron straps
    gfx.lineStyle(4, 0x1565c0, 1);
    gfx.beginPath();
    gfx.moveTo(-10, 0);
    gfx.lineTo(-8, -15);
    gfx.strokePath();
    gfx.beginPath();
    gfx.moveTo(10, 0);
    gfx.lineTo(8, -15);
    gfx.strokePath();

    // Shirt collar
    gfx.fillStyle(0xffffff, 1);
    gfx.beginPath();
    gfx.moveTo(-8, -15);
    gfx.lineTo(0, -10);
    gfx.lineTo(8, -15);
    gfx.lineTo(8, -20);
    gfx.lineTo(-8, -20);
    gfx.closePath();
    gfx.fillPath();

    // Head
    gfx.fillStyle(skinColor, 1);
    gfx.fillCircle(0, -32, 16);

    // Hair (curly puffs - like Ava!)
    gfx.fillStyle(0x1a1a1a, 1);
    // Top of head - fuller curly hair
    gfx.fillEllipse(0, -44, 22, 14);
    gfx.fillCircle(-12, -40, 10);
    gfx.fillCircle(12, -40, 10);
    // Puff balls on sides
    gfx.fillCircle(-20, -32, 10);
    gfx.fillCircle(20, -32, 10);

    // Hair ties (colorful beads)
    gfx.fillStyle(0xe91e63, 1);
    gfx.fillCircle(-18, -38, 3);
    gfx.fillCircle(18, -38, 3);
    gfx.fillStyle(0xffc107, 1);
    gfx.fillCircle(-20, -28, 2);
    gfx.fillCircle(20, -28, 2);

    // Eyes
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillCircle(-5, -34, 3);
    gfx.fillCircle(5, -34, 3);

    // Eye shine
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(-4, -35, 1);
    gfx.fillCircle(6, -35, 1);

    // Smile
    gfx.lineStyle(2, 0x3e2723, 1);
    gfx.beginPath();
    gfx.arc(0, -28, 6, 0.2, Math.PI - 0.2);
    gfx.strokePath();

    // Arms
    gfx.fillStyle(skinColor, 1);
    // Left arm (resting)
    gfx.fillEllipse(-22, 15, 8, 14);
    // Right arm (raised, scanning gesture)
    gfx.fillEllipse(25, 5, 8, 14);

    // Hands
    gfx.fillCircle(-22, 25, 6);
    gfx.fillCircle(30, 10, 6);

    this.cashierGroup.add(gfx);
  },

  // --- Customer Area ---

  createCustomer: function (w, h) {
    // Position customer at floor level on the left side of the belt
    var customerX = this.conveyorBeltX - 45;
    var customerY = this.groundY - 70;

    this.customerGroup = this.add.container(customerX, customerY);
    this.customerGroup.setDepth(25);
    this.customerGroup.setScale(2.5); // Make customer much bigger to match cashier
    this.customerBaseY = customerY;

    this.drawCustomer();
  },

  drawCustomer: function (mood) {
    if (!this.customerGroup) return;

    // Clear previous customer
    this.customerGroup.removeAll(true);

    mood = mood || 'neutral';

    var gfx = this.add.graphics();

    // Customer body colors cycle
    var bodyColors = [0xe91e63, 0x9c27b0, 0x2196f3, 0x4caf50, 0xff9800];
    var hairColors = [0x5d4037, 0x212121, 0x1a1a1a, 0x8d6e63, 0x424242];
    var colorIdx = this.itemIndex % bodyColors.length;
    var bodyColor = bodyColors[colorIdx];
    var hairColor = hairColors[colorIdx];

    // Randomly make some customers Black (about 40% chance)
    var isBlack = (this.itemIndex % 5 === 1) || (this.itemIndex % 5 === 3);
    var skinColor = isBlack ? 0x8B4513 : 0xffcc80;

    // Body (shirt)
    gfx.fillStyle(bodyColor, 1);
    gfx.fillRoundedRect(-20, 0, 40, 50, 8);

    // Head
    gfx.fillStyle(skinColor, 1);
    gfx.fillCircle(0, -20, 20);

    // Hair - different style for Black customers
    if (isBlack) {
      gfx.fillStyle(0x1a1a1a, 1);
      // Curly/afro style
      gfx.fillCircle(0, -32, 16);
      gfx.fillCircle(-10, -28, 10);
      gfx.fillCircle(10, -28, 10);
    } else {
      gfx.fillStyle(hairColor, 1);
      gfx.fillEllipse(0, -32, 24, 14);
    }

    // Eyes - change based on mood
    if (mood === 'happy') {
      // Happy eyes (closed arcs)
      gfx.lineStyle(3, 0x4e342e, 1);
      gfx.beginPath();
      gfx.arc(-7, -22, 4, Math.PI, 0);
      gfx.strokePath();
      gfx.beginPath();
      gfx.arc(7, -22, 4, Math.PI, 0);
      gfx.strokePath();
    } else if (mood === 'sad') {
      // Sad eyes
      gfx.fillStyle(0x4e342e, 1);
      gfx.fillCircle(-7, -20, 3);
      gfx.fillCircle(7, -20, 3);
      // Eyebrows (sad angle)
      gfx.lineStyle(2, 0x5d4037, 1);
      gfx.beginPath();
      gfx.moveTo(-12, -28);
      gfx.lineTo(-4, -26);
      gfx.strokePath();
      gfx.beginPath();
      gfx.moveTo(12, -28);
      gfx.lineTo(4, -26);
      gfx.strokePath();
    } else {
      // Neutral eyes
      gfx.fillStyle(0x4e342e, 1);
      gfx.fillCircle(-7, -22, 3);
      gfx.fillCircle(7, -22, 3);
    }

    // Mouth - based on mood
    if (mood === 'happy') {
      gfx.fillStyle(0xf06292, 1);
      gfx.beginPath();
      gfx.arc(0, -12, 8, 0, Math.PI);
      gfx.closePath();
      gfx.fillPath();
    } else if (mood === 'sad') {
      gfx.lineStyle(3, 0x5d4037, 1);
      gfx.beginPath();
      gfx.arc(0, -8, 6, Math.PI + 0.3, -0.3);
      gfx.strokePath();
    } else {
      gfx.lineStyle(2, 0x5d4037, 1);
      gfx.beginPath();
      gfx.moveTo(-5, -12);
      gfx.lineTo(5, -12);
      gfx.strokePath();
    }

    // Shopping bag
    gfx.fillStyle(0x8d6e63, 1);
    gfx.fillRect(25, 10, 25, 35);
    gfx.fillStyle(0x6d4c41, 1);
    gfx.fillRect(25, 10, 25, 5);
    // Bag handles
    gfx.lineStyle(3, 0x6d4c41, 1);
    gfx.beginPath();
    gfx.moveTo(30, 10);
    gfx.lineTo(30, 0);
    gfx.lineTo(45, 0);
    gfx.lineTo(45, 10);
    gfx.strokePath();

    this.customerGroup.add(gfx);
  },

  setCustomerMood: function (mood) {
    this.drawCustomer(mood);
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

    // Also move item toward scanner as timer decreases
    this.updateItemPosition(ratio);
  },

  // --- Grocery Items ---

  // Item data with emoji and simple prices
  GROCERY_ITEMS: [
    { name: 'apple', emoji: '\uD83C\uDF4E', price: 1 },
    { name: 'banana', emoji: '\uD83C\uDF4C', price: 1 },
    { name: 'orange', emoji: '\uD83C\uDF4A', price: 2 },
    { name: 'milk', emoji: '\uD83E\uDD5B', price: 3 },
    { name: 'bread', emoji: '\uD83C\uDF5E', price: 2 },
    { name: 'cheese', emoji: '\uD83E\uDDC0', price: 4 },
    { name: 'carrot', emoji: '\uD83E\uDD55', price: 1 },
    { name: 'egg', emoji: '\uD83E\uDD5A', price: 3 },
    { name: 'cookie', emoji: '\uD83C\uDF6A', price: 2 },
    { name: 'juice', emoji: '\uD83E\uDDC3', price: 2 },
  ],

  showItem: function (itemData) {
    var w = this.scale.width;
    var scene = this;

    // Remove old item and stop any existing movement tween
    if (this.itemContainer) {
      this.itemContainer.destroy();
    }
    if (this.itemMoveTween) {
      this.itemMoveTween.stop();
      this.itemMoveTween = null;
    }

    // Increment item index first so new customer appears
    this.itemIndex++;

    // Delay customer change slightly so DOM question updates first
    this.time.delayedCall(100, function () {
      scene.setCustomerMood('neutral');
    });

    // Item starts at far left of belt and moves toward scanner as timer
    var itemStartX = this.conveyorBeltX + 40;
    var itemEndX = this.scannerX - 40;
    var itemY = this.conveyorY - 20;

    this.itemContainer = this.add.container(itemStartX, itemY);
    this.itemContainer.setDepth(30);

    var gfx = this.add.graphics();

    // Item box/package
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRoundedRect(-30, -30, 60, 50, 8);
    gfx.lineStyle(2, 0xe0e0e0, 1);
    gfx.strokeRoundedRect(-30, -30, 60, 50, 8);

    // Display emoji if available
    var emojiText = null;
    if (itemData.visual) {
      emojiText = this.add.text(0, -10, itemData.visual, {
        fontSize: '32px',
      });
      emojiText.setOrigin(0.5);
      this.itemContainer.add(emojiText);
    }

    this.itemContainer.add(gfx);

    // Store positions for timer-based movement
    this.itemStartX = itemStartX;
    this.itemEndX = itemEndX;
  },

  // Called by updateTimerBar to sync item position with timer
  updateItemPosition: function (ratio) {
    if (!this.itemContainer) return;

    // Item moves from start to end as timer goes from 1.0 to 0.0
    var progress = 1.0 - ratio;
    var newX = this.itemStartX + (this.itemEndX - this.itemStartX) * progress;
    this.itemContainer.x = newX;
  },

  onLetterProgress: function () {
    // No longer needed - item movement is now timer-based
  },

  scanItem: function (success, onComplete) {
    var scene = this;

    if (success) {
      // Move item through scanner
      this.tweens.add({
        targets: this.itemContainer,
        x: this.scannerX,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: function () {
          // Beep effect
          scene.showScanBeep();

          // Customer happy
          scene.setCustomerMood('happy');

          // Sparkle burst
          scene.createSuccessParticles();

          // Move item to "bagged" area and fade
          scene.tweens.add({
            targets: scene.itemContainer,
            x: scene.scale.width + 60,
            alpha: 0,
            duration: 600,
            ease: 'Quad.easeIn',
            onComplete: function () {
              if (scene.itemContainer) {
                scene.itemContainer.destroy();
                scene.itemContainer = null;
              }
              if (onComplete) onComplete();
            },
          });
        },
      });
    } else {
      // Item falls off conveyor
      this.setCustomerMood('sad');
      this.doMissAnimation(onComplete);
    }
  },

  showScanBeep: function () {
    var scene = this;

    // Flash the scanner
    var flash = this.add.graphics();
    flash.fillStyle(0x4caf50, 0.6);
    flash.fillRect(this.scannerX - 30, this.conveyorY - 10, 60, 55);
    flash.setDepth(15);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: function () {
        flash.destroy();
      },
    });

    // "BEEP" text
    var beepText = this.add.text(this.scannerX, this.conveyorY + 10, 'BEEP!', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#4caf50',
    });
    beepText.setOrigin(0.5);
    beepText.setDepth(50);

    this.tweens.add({
      targets: beepText,
      y: this.conveyorY - 20,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: function () {
        beepText.destroy();
      },
    });
  },

  createSuccessParticles: function () {
    var scene = this;
    var x = this.scannerX;
    var y = this.conveyorY;

    // Create particle texture
    var burstGfx = this.make.graphics({ x: 0, y: 0, add: false });
    burstGfx.fillStyle(0xffc107, 1);
    burstGfx.fillCircle(4, 4, 4);
    burstGfx.generateTexture('scanburst', 8, 8);
    burstGfx.destroy();

    var emitter = this.add.particles(x, y, 'scanburst', {
      speed: { min: 40, max: 100 },
      angle: { min: 180, max: 360 },
      lifespan: 500,
      scale: { start: 0.8, end: 0 },
      quantity: 12,
      tint: [0xffc107, 0x4caf50, 0x2196f3],
      emitting: false,
    });
    emitter.setDepth(60);
    emitter.explode();

    this.time.delayedCall(800, function () {
      emitter.destroy();
    });
  },

  // --- Miss Animations ---

  doMissAnimation: function (onComplete) {
    var scene = this;
    var missType = Math.floor(Math.random() * 4);

    switch (missType) {
      case 0:
        this.missFallOff(onComplete);
        break;
      case 1:
        this.missRollBack(onComplete);
        break;
      case 2:
        this.missBounce(onComplete);
        break;
      case 3:
        this.missSpin(onComplete);
        break;
    }
  },

  missFallOff: function (onComplete) {
    var scene = this;

    // Item falls off end of belt
    this.tweens.add({
      targets: this.itemContainer,
      x: this.scannerX + 40,
      y: this.groundY + 20,
      angle: 90,
      duration: 500,
      ease: 'Bounce.easeOut',
      onComplete: function () {
        scene.fadeOutItem(onComplete);
      },
    });
  },

  missRollBack: function (onComplete) {
    var scene = this;

    // Item rolls backward off belt
    this.tweens.add({
      targets: this.itemContainer,
      x: -80,
      angle: -360,
      duration: 800,
      ease: 'Quad.easeIn',
      onComplete: function () {
        if (scene.itemContainer) {
          scene.itemContainer.destroy();
          scene.itemContainer = null;
        }
        if (onComplete) onComplete();
      },
    });
  },

  missBounce: function (onComplete) {
    var scene = this;

    // Item bounces off scanner
    this.tweens.add({
      targets: this.itemContainer,
      x: this.scannerX - 20,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: function () {
        // Bounce back
        scene.tweens.add({
          targets: scene.itemContainer,
          x: scene.itemContainer.x - 80,
          y: scene.groundY + 10,
          angle: 45,
          duration: 500,
          ease: 'Bounce.easeOut',
          onComplete: function () {
            scene.fadeOutItem(onComplete);
          },
        });
      },
    });
  },

  missSpin: function (onComplete) {
    var scene = this;

    // Item spins wildly and falls
    this.tweens.add({
      targets: this.itemContainer,
      y: this.groundY + 20,
      angle: 720,
      duration: 700,
      ease: 'Quad.easeIn',
      onComplete: function () {
        scene.fadeOutItem(onComplete);
      },
    });
  },

  fadeOutItem: function (onComplete) {
    var scene = this;

    this.tweens.add({
      targets: this.itemContainer,
      alpha: 0,
      duration: 400,
      onComplete: function () {
        if (scene.itemContainer) {
          scene.itemContainer.destroy();
          scene.itemContainer = null;
        }
        if (onComplete) onComplete();
      },
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
    confettiGfx.generateTexture('confetti', 8, 8);
    confettiGfx.destroy();

    for (var i = 0; i < 3; i++) {
      (function (idx) {
        var delay = idx * 300;
        scene.time.delayedCall(delay, function () {
          var x = w * 0.2 + Math.random() * w * 0.6;
          var emitter = scene.add.particles(x, -10, 'confetti', {
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

          scene.time.delayedCall(2500, function () {
            emitter.destroy();
          });
        });
      })(i);
    }

    // Cashier celebrates
    if (this.cashierGroup) {
      this.tweens.add({
        targets: this.cashierGroup,
        y: this.cashierGroup.y - 15,
        duration: 200,
        yoyo: true,
        repeat: 3,
        ease: 'Quad.easeOut',
      });
    }

    // Customer waves goodbye
    this.setCustomerMood('happy');
    if (this.customerGroup) {
      this.tweens.add({
        targets: this.customerGroup,
        x: -80,
        duration: 1500,
        ease: 'Quad.easeIn',
      });
    }
  },

  // ─── EASTER EGGS ─────────────────────────────────────────────

  startEasterEggs: function () {
    this.easterEggActive = false;
    this.scheduleNextEasterEgg();
  },

  scheduleNextEasterEgg: function () {
    var delay = 12000 + Math.random() * 15000;
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
    if (roll < 25) {
      this.eggCatOnBelt();
    } else if (roll < 45) {
      this.eggPriceCheck();
    } else if (roll < 65) {
      this.eggHelpfulBagger();
    } else if (roll < 80) {
      this.eggCouponRain();
    } else {
      this.eggBeltMalfunction();
    }
  },

  // --- Cat walks across conveyor ---
  eggCatOnBelt: function () {
    var scene = this;
    var w = this.scale.width;
    var startX = -40;
    var endX = w + 40;
    var y = this.conveyorY - 15;

    var cat = this.add.container(startX, y);
    cat.setDepth(35);

    var gfx = this.add.graphics();

    // Cat body (orange tabby)
    gfx.fillStyle(0xff9800, 1);
    gfx.fillEllipse(0, 0, 35, 16);

    // Head
    gfx.fillCircle(18, -5, 12);

    // Ears
    gfx.fillStyle(0xff9800, 1);
    gfx.beginPath();
    gfx.moveTo(12, -14);
    gfx.lineTo(10, -26);
    gfx.lineTo(16, -16);
    gfx.closePath();
    gfx.fillPath();
    gfx.beginPath();
    gfx.moveTo(22, -14);
    gfx.lineTo(26, -24);
    gfx.lineTo(26, -12);
    gfx.closePath();
    gfx.fillPath();

    // Eyes
    gfx.fillStyle(0x4caf50, 1);
    gfx.fillCircle(14, -6, 3);
    gfx.fillCircle(22, -6, 3);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(14, -6, 1.5);
    gfx.fillCircle(22, -6, 1.5);

    // Nose
    gfx.fillStyle(0xe91e63, 1);
    gfx.beginPath();
    gfx.moveTo(27, -4);
    gfx.lineTo(25, -1);
    gfx.lineTo(29, -1);
    gfx.closePath();
    gfx.fillPath();

    // Tail
    gfx.lineStyle(5, 0xff9800, 1);
    gfx.beginPath();
    gfx.moveTo(-18, 0);
    gfx.lineTo(-25, -5);
    gfx.lineTo(-28, -15);
    gfx.strokePath();

    // Stripes
    gfx.lineStyle(2, 0xf57c00, 1);
    gfx.beginPath();
    gfx.moveTo(-5, -8);
    gfx.lineTo(-5, 8);
    gfx.strokePath();
    gfx.beginPath();
    gfx.moveTo(3, -8);
    gfx.lineTo(3, 8);
    gfx.strokePath();

    cat.add(gfx);

    // Walk animation (bob)
    this.tweens.add({
      targets: cat,
      y: y - 3,
      duration: 150,
      yoyo: true,
      repeat: -1,
    });

    // Walk across belt
    this.tweens.add({
      targets: cat,
      x: endX,
      duration: 4000,
      ease: 'Linear',
      onComplete: function () {
        cat.destroy();
        scene.easterEggActive = false;
      },
    });
  },

  // --- Price check announcement ---
  eggPriceCheck: function () {
    var scene = this;
    var w = this.scale.width;
    var h = this.scale.height;

    // PA announcement text
    var messages = [
      'Price check on aisle 3!',
      'Cleanup on aisle 7!',
      'Manager to register 2!',
      'Special on bananas!',
      'Fresh cookies ready!',
    ];
    var msg = messages[Math.floor(Math.random() * messages.length)];

    var text = this.add.text(w / 2, h * 0.12, '\uD83D\uDCE2 ' + msg, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#1565c0',
      backgroundColor: '#e3f2fd',
      padding: { x: 12, y: 6 },
    });
    text.setOrigin(0.5);
    text.setDepth(70);
    text.setAlpha(0);

    // Fade in
    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 300,
    });

    // Fade out after delay
    this.time.delayedCall(2500, function () {
      scene.tweens.add({
        targets: text,
        alpha: 0,
        duration: 400,
        onComplete: function () {
          text.destroy();
          scene.easterEggActive = false;
        },
      });
    });
  },

  // --- Helpful bagger kid appears ---
  eggHelpfulBagger: function () {
    var scene = this;
    var w = this.scale.width;
    var startX = w + 50;
    var endX = w * 0.9;
    var y = this.groundY - 40;

    var bagger = this.add.container(startX, y);
    bagger.setDepth(22);

    var gfx = this.add.graphics();

    // Body (green apron)
    gfx.fillStyle(0x4caf50, 1);
    gfx.fillRoundedRect(-12, 0, 24, 35, 5);

    // Head
    gfx.fillStyle(0xffcc80, 1);
    gfx.fillCircle(0, -15, 12);

    // Hair
    gfx.fillStyle(0x8d6e63, 1);
    gfx.fillEllipse(0, -22, 14, 8);

    // Eyes
    gfx.fillStyle(0x4e342e, 1);
    gfx.fillCircle(-4, -16, 2);
    gfx.fillCircle(4, -16, 2);

    // Smile
    gfx.lineStyle(2, 0x5d4037, 1);
    gfx.beginPath();
    gfx.arc(0, -12, 4, 0.2, Math.PI - 0.2);
    gfx.strokePath();

    // Paper bag they're holding
    gfx.fillStyle(0x8d6e63, 1);
    gfx.fillRect(-18, 5, 16, 25);
    gfx.fillStyle(0x6d4c41, 1);
    gfx.fillRect(-18, 5, 16, 4);

    bagger.add(gfx);

    // Walk in
    this.tweens.add({
      targets: bagger,
      x: endX,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: function () {
        // Wave
        scene.tweens.add({
          targets: bagger,
          angle: 5,
          duration: 150,
          yoyo: true,
          repeat: 3,
          onComplete: function () {
            // Walk out
            scene.tweens.add({
              targets: bagger,
              x: startX,
              duration: 1000,
              ease: 'Quad.easeIn',
              onComplete: function () {
                bagger.destroy();
                scene.easterEggActive = false;
              },
            });
          },
        });
      },
    });
  },

  // --- Coupon rain ---
  eggCouponRain: function () {
    var scene = this;
    var w = this.scale.width;
    var h = this.scale.height;

    // Create coupon texture
    var couponGfx = this.make.graphics({ x: 0, y: 0, add: false });
    couponGfx.fillStyle(0xfff9c4, 1);
    couponGfx.fillRect(0, 0, 12, 8);
    couponGfx.lineStyle(1, 0xffc107, 1);
    couponGfx.strokeRect(0, 0, 12, 8);
    couponGfx.generateTexture('coupon', 12, 8);
    couponGfx.destroy();

    // Rain coupons
    for (var i = 0; i < 15; i++) {
      (function (idx) {
        var delay = idx * 100;
        scene.time.delayedCall(delay, function () {
          var x = Math.random() * w;
          var coupon = scene.add.image(x, -20, 'coupon');
          coupon.setDepth(65);

          scene.tweens.add({
            targets: coupon,
            y: h + 20,
            angle: Math.random() * 360,
            duration: 2000 + Math.random() * 1000,
            ease: 'Linear',
            onComplete: function () {
              coupon.destroy();
            },
          });
        });
      })(i);
    }

    this.time.delayedCall(3500, function () {
      scene.easterEggActive = false;
    });
  },

  // --- Belt briefly goes backward ---
  eggBeltMalfunction: function () {
    var scene = this;

    // Reverse stripe animation temporarily
    var originalTime = this.conveyorTime;

    // Show "Whoops!" text
    var text = this.add.text(this.conveyorBeltX + this.conveyorBeltWidth / 2, this.conveyorY - 25, 'Whoops!', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#e53935',
      backgroundColor: '#ffebee',
      padding: { x: 8, y: 4 },
    });
    text.setOrigin(0.5);
    text.setDepth(40);

    // Make stripes go backward for a moment
    var backwardTween = this.tweens.addCounter({
      from: 0,
      to: -50,
      duration: 1000,
      onUpdate: function () {
        scene.conveyorTime = originalTime + backwardTween.getValue();
      },
      onComplete: function () {
        text.destroy();
        scene.easterEggActive = false;
      },
    });
  },

  // ─── END EASTER EGGS ───────────────────────────────────────

  // --- Cleanup ---

  shutdown: function () {
    this.conveyorStripes = [];
    if (this.itemContainer) {
      this.itemContainer.destroy();
      this.itemContainer = null;
    }
  },
});
