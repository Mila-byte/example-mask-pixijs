import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { RenderTexture } from '@pixi/core';
import { APP_WIDTH, APP_HEIGHT, APP_CENTER_X, APP_CENTER_Y } from './config';
import { RenderPrepare } from './application-scene';
import gsap from 'gsap';

export class MaskExample extends Container {
  private text: Text;
  private bg: Graphics;
  private maskBg: Graphics;
  private maskContainer: Container;
  constructor() {
    super();
    this.createMaskContainer();
    this.createWhiteBg();
    this.animatedText();
  }

  private createMaskContainer(): void {
    this.maskContainer = new Container();
    this.createMaskBg();
    this.createText();
  }

  private createText(): void {
    this.text = new Text('EXAMPLE MASK', {
      fontSize: 200,
      fill: 0x000000,
      fontWeight: 'bold',
    });
    this.text.anchor.set(0.5);
    this.text.position.set(APP_CENTER_X, APP_CENTER_Y);
    this.maskContainer.addChild(this.text);
  }

  private createMaskBg(): void {
    this.maskBg = new Graphics()
      .beginFill(0xffffff)
      .drawRect(0, 0, APP_WIDTH, APP_HEIGHT);
    this.maskContainer.addChild(this.maskBg);
  }

  private createWhiteBg(): void {
    this.bg = new Graphics()
      .beginFill(0xffffff)
      .drawRect(0, 0, APP_WIDTH, APP_HEIGHT);
    this.bg.alpha = 0.75;
    const textTexture = RenderPrepare.renderer.generateTexture(
      this.maskContainer
    );
    const mask = new Sprite(textTexture);
    this.bg.addChild(mask);
    this.bg.mask = mask;
    this.bg.pivot.set(APP_WIDTH / 2, APP_HEIGHT / 2);
    this.bg.position.set(APP_CENTER_X, APP_CENTER_Y);
    this.addChild(this.bg);
  }

  private animatedText(): void {
    gsap.to(this.bg.scale, {
      x: '+=0.2',
      y: '+=0.2',
      duration: 0.5,
      yoyo: true,
      yoyoEase: 'linear',
      repeat: -1,
      //how to update text?
      // onUpdate: () => {
      //   RenderPrepare.renderer.render(this.text, {
      //     renderTexture: RenderTexture.create({
      //       width: this.text.width,
      //       height: this.text.height,
      //     }),
      //   });
      // },
    });
  }
}
