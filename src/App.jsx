import React, { useState, useRef, useEffect } from "react";
import Phaser from "phaser";
import logoBzr from "./assets/logo-bzr.svg";

export default function App() {
  const gameRef = useRef(null);
  const [checkpoint, setCheckpoint] = useState(1);

  useEffect(() => {
    if (!gameRef.current) {
      initGame();
    }
  }, []);

  const initGame = () => {
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: "game-container",
      backgroundColor: "#87ceeb",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: [Checkpoint1Scene, Checkpoint2Scene, Checkpoint3Scene, Checkpoint4Scene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };
    gameRef.current = new Phaser.Game(config);
  };

  /** =================
   *   CHECKPOINT 1
   *  ================
   */
  class Checkpoint1Scene extends Phaser.Scene {
    constructor() {
      super("Checkpoint1Scene");
    }

    preload() {
      this.load.image("bgSky", "https://i.ibb.co/0nK3yGW/mario-sky.png");
      this.load.image("plane", "https://i.ibb.co/hgmnxKJ/mario-plane.png");
      this.load.image("greenLand", "https://i.ibb.co/rcdD7yN/green-land.png");
      this.load.image("beach", "https://i.ibb.co/b6y3nvV/mario-beach.png");
      this.load.image("city", "https://i.ibb.co/6rGhP9g/mario-city.png");
      this.load.image("desert", "https://i.ibb.co/LJ8Hbqg/mario-desert.png");
      this.load.image("mountains", "https://i.ibb.co/pRJttdT/mario-mountains.png");
    }

    create() {
      this.add.image(this.scale.width / 2, this.scale.height / 2, "bgSky").setDisplaySize(this.scale.width, this.scale.height);

      this.plane = this.physics.add.sprite(this.scale.width / 2, 100, "plane").setScale(0.2);

      const lands = [
        { key: "greenLand", correct: true, x: this.scale.width / 5 },
        { key: "beach", correct: false, x: (this.scale.width / 5) * 2 },
        { key: "city", correct: false, x: (this.scale.width / 5) * 3 },
        { key: "desert", correct: false, x: (this.scale.width / 5) * 4 },
        { key: "mountains", correct: false, x: (this.scale.width / 5) * 5 },
      ];

      lands.forEach((land, i) => {
        const landSprite = this.add.image(land.x, this.scale.height - 100, land.key).setScale(0.15).setInteractive();
        landSprite.on("pointerdown", () => {
          if (land.correct) {
            this.scene.start("Checkpoint2Scene");
          } else {
            this.scene.restart();
          }
        });
      });
    }
  }
    /** =================
   *   CHECKPOINT 2
   *  ================
   * Catch 3 fish in 180s (drag to move hook horizontally, tap to cast).
   */
  class Checkpoint2Scene extends Phaser.Scene {
    constructor() {
      super("Checkpoint2Scene");
      this.catches = 0;
      this.timeLeft = 180; // seconds
      this.hookX = 0.5;    // 0..1 normalized
      this.fishGroup = null;
      this.hook = null;
      this.timerText = null;
      this.infoText = null;
    }

    preload() {
      // Simple gradients & shapes rendered via graphics; no external images required.
    }

    create() {
      const W = this.scale.width, H = this.scale.height;

      // Sky → Sea gradient
      const sky = this.add.graphics();
      const skyGrad = sky.createGradient(0, 0, 0, H, [
        { color: 0x60a5fa, pos: 0.0 },
        { color: 0x93c5fd, pos: 0.45 },
        { color: 0x0ea5e9, pos: 0.46 },
        { color: 0x0369a1, pos: 1.0 },
      ]);
      sky.fillGradientStyle(skyGrad); sky.fillRect(0, 0, W, H);

      // Sand
      const sand = this.add.rectangle(W * 0.5, H * 0.85, W, H * 0.3, 0xfbbf24);
      sand.setDepth(1);

      // Hook (circle) + line
      const waterlineY = H * 0.58;
      this.line = this.add.line(0, 0, W * this.hookX, 0, W * this.hookX, waterlineY, 0xe2e8f0).setOrigin(0, 0).setLineWidth(2);
      this.hook = this.add.circle(W * this.hookX, waterlineY, 8, 0x94a3b8);

      // Fish group
      this.fishGroup = this.add.group();
      this.time.addEvent({
        delay: 700,
        loop: true,
        callback: () => this.spawnFish()
      });

      // UI
      this.timerText = this.add.text(12, 12, "⏱ 03:00", { fontFamily: "ui-sans-serif", fontSize: 16, color: "#ffffff" });
      this.caughtText = this.add.text(12, 34, "🎯 0 / 3", { fontFamily: "ui-sans-serif", fontSize: 16, color: "#ffffff" });
      this.infoText = this.add.text(12, 56, "Drag to move, tap to cast", { fontFamily: "ui-sans-serif", fontSize: 14, color: "#dbeafe" });

      // Countdown timer
      this.timeEvent = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          this.timeLeft--;
          this.timerText.setText("⏱ " + this.formatTime(this.timeLeft));
          if (this.timeLeft <= 0) this.restartRound("Time's up! Try again.");
        }
      });

      // Touch controls
      this.input.on("pointerdown", (p) => this.tryCatch(p));
      this.input.on("pointermove", (p) => {
        if (!p.isDown && p.pointerType !== "touch") return;
        this.hookX = Phaser.Math.Clamp(p.x / W, 0, 1);
        this.updateHook();
      });

      // Subtle waves animation
      this.tweens.add({
        targets: this.line,
        duration: 1200,
        repeat: -1,
        yoyo: true,
        props: { y: { from: 0, to: 4 } },
        ease: "Sine.inOut"
      });
    }

    update() {
      // Move fish and check collisions
      this.fishGroup.getChildren().forEach((f) => {
        f.x += f.dir * f.speed;
        if (f.x < -40 || f.x > this.scale.width + 40) {
          f.dir *= -1;
        }
        // Catch condition: near hook X and under waterline
        if (!f.caught && Math.abs(f.x - this.hook.x) < 28 && f.y > this.hook.y - 6) {
          f.caught = true;
          this.catches++;
          this.caughtText.setText(`🎯 ${this.catches} / 3`);
          this.pop(f.x, f.y);
          f.destroy();

          if (this.catches >= 3) {
            // Small delay for feedback, then advance
            this.time.delayedCall(300, () => this.scene.start("Checkpoint3Scene"));
          }
        }
      });
    }

    updateHook() {
      const W = this.scale.width, H = this.scale.height, waterlineY = H * 0.58;
      const x = W * this.hookX;
      this.line.setTo(x, 0, x, waterlineY);
      this.hook.setPosition(x, waterlineY);
    }

    tryCatch(p) {
      // Provide feedback even if no fish — tiny beep pop
      this.pop(this.hook.x, this.hook.y);
    }

    spawnFish() {
      if (this.fishGroup.getLength() > 12) return;
      const W = this.scale.width, H = this.scale.height;
      const y = Phaser.Math.Between(H * 0.62, H * 0.85);
      const dir = Math.random() < 0.5 ? -1 : 1;
      const x = dir < 0 ? W + 20 : -20;
      const speed = Phaser.Math.FloatBetween(1.2, 2.4) * dir;

      const color = 0x22d3ee; // cyan
      const fish = this.add.circle(x, y, 14, color);
      fish.dir = dir;
      fish.speed = speed;
      fish.caught = false;

      // Tail flick
      this.tweens.add({
        targets: fish,
        duration: 450,
        repeat: -1,
        yoyo: true,
        scaleX: { from: 1, to: 0.85 },
        ease: "Sine.inOut"
      });

      this.fishGroup.add(fish);
    }

    restartRound(message) {
      this.addToast(message || "Round restarted");
      this.catches = 0;
      this.timeLeft = 180;
      this.caughtText.setText("🎯 0 / 3");
      this.timerText.setText("⏱ 03:00");
      this.fishGroup.clear(true, true);
    }

    pop(x, y) {
      const burst = this.add.particles(0, 0, "emit", {
        x: x, y: y,
        speed: { min: 40, max: 120 },
        lifespan: 300,
        quantity: 8,
        tint: [0x22d3ee, 0x06b6d4, 0xe2e8f0],
        scale: { start: 0.5, end: 0 },
        blendMode: "ADD",
      });
      // Fallback (no texture): draw small circles via graphics for one frame
      if (!burst) {
        const g = this.add.circle(x, y, 3, 0xffffff);
        this.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });
      }
    }

    addToast(msg) {
      const t = this.add.text(this.scale.width / 2, 90, msg, {
        fontFamily: "ui-sans-serif", fontSize: 16, color: "#ffffff", backgroundColor: "#00000066", padding: { x: 8, y: 6 }
      }).setOrigin(0.5);
      this.tweens.add({ targets: t, alpha: 0, duration: 900, delay: 500, onComplete: () => t.destroy() });
    }

    formatTime(sec) {
      const m = Math.floor(sec / 60).toString().padStart(2, "0");
      const s = (sec % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    }
  }
    /** =================
   *   CHECKPOINT 3
   *  ================
   * Collect 5 hearts before hitting 2 monkeys (swipe lanes).
   */
  class Checkpoint3Scene extends Phaser.Scene {
    constructor() {
      super("Checkpoint3Scene");
      this.hearts = 0;
      this.monkeys = 0;
      this.lanePositions = [];
      this.vehicle = null;
      this.spawnTimer = 0;
    }

    preload() {
      this.load.image("road", "https://i.ibb.co/q1Lvg7V/mario-road.png");
      this.load.image("4wheeler", "https://i.ibb.co/ggm0tpV/mario-4wheeler.png");
      this.load.image("heart", "https://i.ibb.co/6WXjtxF/mario-heart.png");
      this.load.image("monkey", "https://i.ibb.co/pR21VRR/mario-monkey.png");
    }

    create() {
      const W = this.scale.width, H = this.scale.height;

      // Road background
      this.add.image(W / 2, H / 2, "road").setDisplaySize(W, H);

      // Lane positions: left, center, right
      this.lanePositions = [W * 0.3, W * 0.5, W * 0.7];

      // Player vehicle
      this.vehicle = this.physics.add.sprite(W * 0.5, H - 100, "4wheeler").setScale(0.15);
      this.vehicle.setCollideWorldBounds(true);

      // Touch swipe controls
      let startX = null;
      this.input.on("pointerdown", (p) => (startX = p.x));
      this.input.on("pointerup", (p) => {
        if (startX === null) return;
        const dx = p.x - startX;
        if (dx > 40) this.moveRight();
        else if (dx < -40) this.moveLeft();
        else this.moveCenter();
        startX = null;
      });

      // HUD
      this.heartText = this.add.text(12, 12, "❤️ 0 / 5", { fontSize: 18, color: "#fff" });
      this.monkeyText = this.add.text(12, 36, "🙈 0 / 2", { fontSize: 18, color: "#fff" });

      // Spawn loop
      this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => this.spawnItem()
      });
    }

    moveLeft() {
      this.vehicle.x = this.lanePositions[0];
    }

    moveCenter() {
      this.vehicle.x = this.lanePositions[1];
    }

    moveRight() {
      this.vehicle.x = this.lanePositions[2];
    }

    spawnItem() {
      const lane = Phaser.Math.Between(0, 2);
      const isHeart = Math.random() < 0.6; // 60% heart, 40% monkey
      const key = isHeart ? "heart" : "monkey";
      const item = this.physics.add.sprite(this.lanePositions[lane], -50, key).setScale(0.12);
      item.setVelocityY(200);

      this.physics.add.overlap(this.vehicle, item, () => {
        if (isHeart) {
          this.hearts++;
          this.heartText.setText(`❤️ ${this.hearts} / 5`);
          if (this.hearts >= 5) this.scene.start("Checkpoint4Scene");
        } else {
          this.monkeys++;
          this.monkeyText.setText(`🙈 ${this.monkeys} / 2`);
          if (this.monkeys >= 2) this.scene.restart();
        }
        item.destroy();
      });
    }
  }
    /** =================
   *   CHECKPOINT 4
   *  ================
   * Final door/key + hug/slap choice
   */
  class Checkpoint4Scene extends Phaser.Scene {
    constructor() {
      super("Checkpoint4Scene");
    }

    preload() {
      this.load.image("bgFinal", "https://i.ibb.co/F6P2RLc/mario-final-bg.png");
      this.load.image("door", "https://i.ibb.co/NFL4LgL/mario-door.png");
      this.load.image("key", "https://i.ibb.co/Q8B7sJ3/mario-key.png");
      this.load.image("bzr", "https://i.ibb.co/TW3r4Hg/mario-bzr.png");
      this.load.audio("fight", "https://actions.google.com/sounds/v1/human_voices/angry_male.ogg");
      this.load.audio("confettiSound", "https://actions.google.com/sounds/v1/cartoon/congratulations.ogg");
      this.load.audio("boo", "https://actions.google.com/sounds/v1/crowds/boo.ogg");
    }

    create() {
      const W = this.scale.width, H = this.scale.height;

      this.add.image(W / 2, H / 2, "bgFinal").setDisplaySize(W, H);

      // Fighting sounds
      this.sound.play("fight", { loop: true, volume: 0.4 });

      // Place door
      const door = this.add.image(W * 0.8, H * 0.75, "door").setScale(0.25).setInteractive();

      // Key (auto collected)
      const key = this.add.image(W * 0.2, H * 0.75, "key").setScale(0.15);
      this.time.delayedCall(1000, () => key.destroy());

      door.on("pointerdown", () => {
        this.sound.stopAll();
        this.showChoice();
      });
    }

    showChoice() {
      const W = this.scale.width, H = this.scale.height;

      // bzr character
      const bzr = this.add.image(W / 2, H / 2 - 60, "bzr").setScale(0.3);

      // Thought bubble text
      const bubble = this.add.rectangle(W / 2, H / 2 + 100, W * 0.8, 120, 0xffffff, 0.9).setStrokeStyle(2, 0x000000);
      const bubbleText = this.add.text(W / 2, H / 2 + 100, "What will 3’bya do?\n🤗 Hug    👋 Slap", {
        fontSize: 20,
        color: "#000",
        align: "center"
      }).setOrigin(0.5);

      bubble.setInteractive();
      bubble.on("pointerdown", (p) => {
        if (p.x < W / 2) {
          // Hug
          this.sound.play("confettiSound");
          this.add.text(W / 2, H / 2 + 200, "🎉 You win! An apology appears 🎉", { fontSize: 18, color: "#fff" }).setOrigin(0.5);
          this.confetti();
        } else {
          // Slap
          this.sound.play("boo");
          this.scene.restart();
        }
      });
    }

    confetti() {
      const particles = this.add.particles("heart");
      particles.createEmitter({
        x: { min: 0, max: this.scale.width },
        y: 0,
        lifespan: 2000,
        speedY: { min: 200, max: 400 },
        quantity: 4,
        scale: { start: 0.4, end: 0 },
        tint: [0xff0000, 0xffff00, 0x00ff00, 0x0000ff],
        blendMode: "ADD"
      });
    }
  }
}
