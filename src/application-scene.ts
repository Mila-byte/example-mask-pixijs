import { Application, ICanvas, IRenderer, Prepare, Renderer } from 'pixi.js';
import { MaskExample } from './mask-example';

export const RenderPrepare: {
  prepare?: Prepare;
  renderer?: Renderer | IRenderer<ICanvas>;
} = {};
export class ApplicationScene {
  private application: Application;
  private example: MaskExample;
  constructor() {
    this.application = new Application({
      width: 1920,
      height: 1080,
      backgroundColor: '#1099bb',
      view: document.getElementById('canvas') as HTMLCanvasElement,
    });

    RenderPrepare.renderer = this.application.renderer;
    RenderPrepare.prepare = this.application.renderer.prepare;

    this.example = new MaskExample();
    this.application.stage.addChild(this.example);
  }
}
