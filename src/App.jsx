import React, { useState, useRef, useEffect } from "react";
import Phaser from "phaser";

export default function App() {
  const containerRef = useRef(null);   // ✅ where Phaser will mount
  const gameRef = useRef(null);
  const [checkpoint, setCheckpoint] = useState(1);

  useEffect(() => {
    if (!gameRef.current && containerRef.current) {
      initGame();
    }
  }, [containerRef]);

  const initGame = () => {
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: containerRef.current,      // ✅ mount here
      backgroundColor: "#87ceeb",
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false },
      },
      scene: [Checkpoint1Scene, Checkpoint2Scene, Checkpoint3Scene, Checkpoint4Scene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    };
    gameRef.current = new Phaser.Game(config);
  };

  /** =================
   *   CHECKPOINT 1
   *  ================
   */
  /** =================
 *   CHECKPOINT 1 — asset-free test
 *  ================
 */
class Checkpoint1Scene extends Phaser.Scene {
  constructor() { super("Checkpoint1Scene"); }

  preload() {}

  create(){
    const W=this.scale.width,H=this.scale.height;
    const g=this.add.graphics();
    const grad=g.createGradient(0,0,0,H,[{color:0x60a5fa,pos:0},{color:0x93c5fd,pos:0.5},{color:0x1e293b,pos:1}]);
    g.fillGradientStyle(grad); g.fillRect(0,0,W,H);

    this.add.text(16,16,"Checkpoint 1 (test): tap green Safari", {fontSize:18,color:"#fff"});

    const opts=[["Safari 🦒🐘",true],["Beach 🏝️",false],["City 🏙️",false],["Desert 🏜️",false],["Mountains 🏔️",false]];
    const col=W/5;
    opts.forEach((o,i)=>{
      const x=col*(i+0.5), y=H*0.8;
      const ok=o[1];
      const btn=this.add.rectangle(x,y,col*0.9,52,0x111827,0.7)
        .setStrokeStyle(2,0x334155)
        .setInteractive({useHandCursor:true});
      this.add.text(x,y,o[0],{fontSize:14,color:"#fff"}).setOrigin(0.5);
      this.add.rectangle(x,y+30,col*0.86,6, ok?0x16a34a:0x3b82f6).setOrigin(0.5);
      btn.on("pointerdown",()=> ok?this.scene.start("Checkpoint2Scene"):this.scene.restart());
    });
  }
}
    create() {
      const W = this.scale.width, H = this.scale.height;
      this.add.image(W / 2, H / 2, "bgSky").setDisplaySize(W, H);
      this.physics.add.sprite(W / 2, 100, "plane").setScale(0.2);

      const lands = [
        { key: "greenLand", correct: true, x: W * 0.17 },
        { key: "beach", correct: false, x: W * 0.34 },
        { key: "city", correct: false, x: W * 0.51 },
        { key: "desert", correct: false, x: W * 0.68 },
        { key: "mountains", correct: false, x: W * 0.85 },
      ];

      lands.forEach((land) => {
        const s = this.add.image(land.x, H - 100, land.key).setScale(0.15).setInteractive();
        s.on("pointerdown", () => {
          if (land.correct) this.scene.start("Checkpoint2Scene");
          else this.scene.restart();
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
      this.catches = 0; this.timeLeft = 180; this.hookX = 0.5;
      this.fishGroup = null; this.hook = null;
    }
    create() {
      const W = this.scale.width, H = this.scale.height;

      // Sky → Sea gradient with rectangles (no external assets)
      const sky = this.add.graphics();
      const grad = sky.createGradient(0, 0, 0, H, [
        { color: 0x60a5fa, pos: 0.0 }, { color: 0x93c5fd, pos: 0.45 },
        { color: 0x0ea5e9, pos: 0.46 }, { color: 0x0369a1, pos: 1.0 },
      ]);
      sky.fillGradientStyle(grad); sky.fillRect(0, 0, W, H);
      this.add.rectangle(W / 2, H * 0.85, W, H * 0.3, 0xfbbf24);

      const waterlineY = H * 0.58;
      this.line = this.add.line(0, 0, W * this.hookX, 0, W * this.hookX, waterlineY, 0xe2e8f0).setOrigin(0, 0).setLineWidth(2);
      this.hook = this.add.circle(W * this.hookX, waterlineY, 8, 0x94a3b8);

      this.fishGroup = this.add.group();
      this.time.addEvent({ delay: 700, loop: true, callback: () => this.spawnFish() });

      this.timerText = this.add.text(12, 12, "⏱ 03:00", { fontSize: 16, color: "#fff" });
      this.caughtText = this.add.text(12, 34, "🎯 0 / 3", { fontSize: 16, color: "#fff" });
      this.add.text(12, 56, "Drag to move, tap to cast", { fontSize: 14, color: "#dbeafe" });

      this.timeEvent = this.time.addEvent({
        delay: 1000, loop: true, callback: () => {
          this.timeLeft--; this.timerText.setText("⏱ " + this.formatTime(this.timeLeft));
          if (this.timeLeft <= 0) this.restartRound("Time's up! Try again.");
        }
      });

      this.input.on("pointerdown", () => this.pop(this.hook.x, this.hook.y));
      this.input.on("pointermove", (p) => {
        if (!p.isDown && p.pointerType !== "touch") return;
        this.hookX = Phaser.Math.Clamp(p.x / W, 0, 1); this.updateHook();
      });

      this.tweens.add({ targets: this.line, duration: 1200, repeat: -1, yoyo: true, props: { y: { from: 0, to: 4 } }, ease: "Sine.inOut" });
    }
    update() {
      this.fishGroup.getChildren().forEach((f) => {
        f.x += f.dir * f.speed;
        if (f.x < -40 || f.x > this.scale.width + 40) f.dir *= -1;
        if (!f.caught && Math.abs(f.x - this.hook.x) < 28 && f.y > this.hook.y - 6) {
          f.caught = true; this.catches++; this.caughtText.setText(`🎯 ${this.catches} / 3`);
          this.pop(f.x, f.y); f.destroy();
          if (this.catches >= 3) this.time.delayedCall(300, () => this.scene.start("Checkpoint3Scene"));
        }
      });
    }
    updateHook() {
      const W = this.scale.width, H = this.scale.height, y = H * 0.58;
      const x = W * this.hookX; this.line.setTo(x, 0, x, y); this.hook.setPosition(x, y);
    }
    spawnFish() {
      if (this.fishGroup.getLength() > 12) return;
      const W = this.scale.width, H = this.scale.height;
      const y = Phaser.Math.Between(H * 0.62, H * 0.85);
      const dir = Math.random() < 0.5 ? -1 : 1; const x = dir < 0 ? W + 20 : -20;
      const speed = Phaser.Math.FloatBetween(1.2, 2.4) * dir;
      const fish = this.add.circle(x, y, 14, 0x22d3ee); fish.dir = dir; fish.speed = speed; fish.caught = false;
      this.tweens.add({ targets: fish, duration: 450, repeat: -1, yoyo: true, scaleX: { from: 1, to: 0.85 }, ease: "Sine.inOut" });
      this.fishGroup.add(fish);
    }
    restartRound(msg) {
      this.addToast(msg || "Round restarted"); this.catches = 0; this.timeLeft = 180;
      this.caughtText.setText("🎯 0 / 3"); this.timerText.setText("⏱ 03:00"); this.fishGroup.clear(true, true);
    }
    pop(x, y) {
      const g = this.add.circle(x, y, 4, 0xffffff);
      this.tweens.add({ targets: g, alpha: 0, scale: 2, duration: 250, onComplete: () => g.destroy() });
    }
    addToast(msg) {
      const t = this.add.text(this.scale.width / 2, 90, msg, { fontSize: 16, color: "#fff", backgroundColor: "#0006", padding: { x: 8, y: 6 } }).setOrigin(0.5);
      this.tweens.add({ targets: t, alpha: 0, duration: 900, delay: 500, onComplete: () => t.destroy() });
    }
    formatTime(sec) { const m = Math.floor(sec / 60).toString().padStart(2, "0"); const s = (sec % 60).toString().padStart(2, "0"); return `${m}:${s}`; }
  }

  /** =================
   *   CHECKPOINT 3
   *  ================
   * Collect 5 hearts before hitting 2 monkeys (swipe lanes).
   */
  class Checkpoint3Scene extends Phaser.Scene {
    constructor() { super("Checkpoint3Scene"); this.hearts = 0; this.monkeys = 0; this.lanePositions = []; }
    preload() {
      this.load.image("road", "https://i.ibb.co/q1Lvg7V/mario-road.png");
      this.load.image("4wheeler", "https://i.ibb.co/ggm0tpV/mario-4wheeler.png");
      this.load.image("heart", "https://i.ibb.co/6WXjtxF/mario-heart.png");
      this.load.image("monkey", "https://i.ibb.co/pR21VRR/mario-monkey.png");
    }
    create() {
      const W = this.scale.width, H = this.scale.height;
      this.add.image(W / 2, H / 2, "road").setDisplaySize(W, H);
      this.lanePositions = [W * 0.3, W * 0.5, W * 0.7];
      this.vehicle = this.physics.add.sprite(W * 0.5, H - 100, "4wheeler").setScale(0.15).setCollideWorldBounds(true);

      let startX = null;
      this.input.on("pointerdown", (p) => (startX = p.x));
      this.input.on("pointerup", (p) => { if (startX === null) return; const dx = p.x - startX;
        if (dx > 40) this.vehicle.x = this.lanePositions[2];
        else if (dx < -40) this.vehicle.x = this.lanePositions[0];
        else this.vehicle.x = this.lanePositions[1]; startX = null; });

      this.heartText = this.add.text(12, 12, "❤️ 0 / 5", { fontSize: 18, color: "#fff" });
      this.monkeyText = this.add.text(12, 36, "🙈 0 / 2", { fontSize: 18, color: "#fff" });

      this.time.addEvent({ delay: 1000, loop: true, callback: () => this.spawnItem() });
    }
    spawnItem() {
      const lane = Phaser.Math.Between(0, 2);
      const isHeart = Math.random() < 0.6;
      const key = isHeart ? "heart" : "monkey";
      const item = this.physics.add.sprite(this.lanePositions[lane], -50, key).setScale(0.12);
      item.setVelocityY(200);
      this.physics.add.overlap(this.vehicle, item, () => {
        if (isHeart) {
          this.hearts++; this.heartText.setText(`❤️ ${this.hearts} / 5`);
          if (this.hearts >= 5) this.scene.start("Checkpoint4Scene");
        } else {
          this.monkeys++; this.monkeyText.setText(`🙈 ${this.monkeys} / 2`);
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
    constructor() { super("Checkpoint4Scene"); }
    preload() {
      this.load.image("bgFinal", "https://i.ibb.co/F6P2RLc/mario-final-bg.png");
      this.load.image("door", "https://i.ibb.co/NFL4LgL/mario-door.png");
      this.load.image("key", "https://i.ibb.co/Q8B7sJ3/mario-key.png");
      this.load.image("bzr", "https://i.ibb.co/TW3r4Hg/mario-bzr.png");
      this.load.image("heart", "https://i.ibb.co/6WXjtxF/mario-heart.png"); // for confetti
      this.load.audio("fight", "https://actions.google.com/sounds/v1/human_voices/angry_male.ogg");
      this.load.audio("confettiSound", "https://actions.google.com/sounds/v1/cartoon/congratulations.ogg");
      this.load.audio("boo", "https://actions.google.com/sounds/v1/crowds/boo.ogg");
    }
    create() {
      const W = this.scale.width, H = this.scale.height;
      this.add.image(W / 2, H / 2, "bgFinal").setDisplaySize(W, H);
      this.sound.play("fight", { loop: true, volume: 0.4 });

      const door = this.add.image(W * 0.8, H * 0.75, "door").setScale(0.25).setInteractive();
      const key = this.add.image(W * 0.2, H * 0.75, "key").setScale(0.15);
      this.time.delayedCall(1000, () => key.destroy());

      door.on("pointerdown", () => { this.sound.stopAll(); this.showChoice(); });
    }
    showChoice() {
      const W = this.scale.width, H = this.scale.height;
      this.add.image(W / 2, H / 2 - 60, "bzr").setScale(0.3);

      const bubble = this.add.rectangle(W / 2, H / 2 + 100, W * 0.8, 120, 0xffffff, 0.9).setStrokeStyle(2, 0x000000).setInteractive();
      this.add.text(W / 2, H / 2 + 100, "What will 3’bya do?\n🤗 Hug    👋 Slap", { fontSize: 20, color: "#000", align: "center" }).setOrigin(0.5);

      bubble.on("pointerdown", (p) => {
        if (p.x < W / 2) {
          this.sound.play("confettiSound");
          this.add.text(W / 2, H / 2 + 200, "🎉 You win! An apology appears 🎉", { fontSize: 18, color: "#fff" }).setOrigin(0.5);
          this.confetti();
        } else {
          this.sound.play("boo"); this.scene.restart();
        }
      });
    }
    confetti() {
      const emitter = this.add.particles(0, 0, "heart", {
        x: { min: 0, max: this.scale.width }, y: 0, lifespan: 2000,
        speedY: { min: 200, max: 400 }, quantity: 4, scale: { start: 0.4, end: 0 }, blendMode: "ADD"
      });
      this.time.delayedCall(2200, () => emitter.stop());
    }
  }

  // ----- render the canvas container for Phaser -----
  return (
    <div
      ref={containerRef}
      id="game-container"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        touchAction: "none",
        background: "#000"
      }}
    />
  );
}
