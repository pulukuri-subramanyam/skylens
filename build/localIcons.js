import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function localIconsPlugin() {
  const read = file => readFileSync(require.resolve('@fortawesome/fontawesome-free/' + file));
  const css = ['fontawesome.min.css', 'solid.min.css', 'brands.min.css'].map(file=>read('css/'+file).toString()).join('\n')
    .replaceAll('../webfonts/', '/assets/fonts/')
    .replace(/,url\([^)]*\.ttf\) format\("truetype"\)/g, '');
  const files = {
    'assets/icons.css': css,
    'assets/fonts/fa-solid-900.woff2': read('webfonts/fa-solid-900.woff2'),
    'assets/fonts/fa-brands-400.woff2': read('webfonts/fa-brands-400.woff2'),
    'assets/fonts/FONT-AWESOME-LICENSE.txt': read('LICENSE.txt')
  };
  return {
    name: 'skylens-local-icons',
    transformIndexHtml: {
      order: 'post',
      handler: () => [{ tag: 'link', attrs: { rel: 'stylesheet', href: '/assets/icons.css' }, injectTo: 'head' }]
    },
    configureServer(server) {
      server.middlewares.use((request,response,next)=>{
        const path = new URL(request.url,'http://localhost').pathname.slice(1);
        if (!Object.hasOwn(files,path)) return next();
        response.setHeader('Content-Type',path.endsWith('.css')?'text/css':path.endsWith('.woff2')?'font/woff2':'text/plain');
        response.end(files[path]);
      });
    },
    generateBundle() {
      for (const [fileName,source] of Object.entries(files)) this.emitFile({type:'asset',fileName,source});
    }
  };
}
