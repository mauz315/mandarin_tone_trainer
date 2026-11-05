(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))l(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&l(a)}).observe(document,{childList:!0,subtree:!0});function t(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function l(s){if(s.ep)return;s.ep=!0;const o=t(s);fetch(s.href,o)}})();var ee=function(){return ee=Object.assign||function(e){for(var n,t=1,l=arguments.length;t<l;t++)for(var s in n=arguments[t])Object.prototype.hasOwnProperty.call(n,s)&&(e[s]=n[s]);return e},ee.apply(this,arguments)};function Le(e,n,t){for(var l,s=0,o=n.length;s<o;s++)!l&&s in n||(l||(l=Array.prototype.slice.call(n,0,s)),l[s]=n[s]);return e.concat(l||Array.prototype.slice.call(n))}function xe(e){return Array.prototype.slice.call(e)}function me(e,n){var t=Math.floor(e);return t===n||t+1===n?e:n}function ge(){return Date.now()}function re(e,n,t){if(n="data-keen-slider-"+n,t===null)return e.removeAttribute(n);e.setAttribute(n,t||"")}function oe(e,n){return n=n||document,typeof e=="function"&&(e=e(n)),Array.isArray(e)?e:typeof e=="string"?xe(n.querySelectorAll(e)):e instanceof HTMLElement?[e]:e instanceof NodeList?xe(e):[]}function ne(e){e.raw&&(e=e.raw),e.cancelable&&!e.defaultPrevented&&e.preventDefault()}function se(e){e.raw&&(e=e.raw),e.stopPropagation&&e.stopPropagation()}function Ee(){var e=[];return{add:function(n,t,l,s){n.addListener?n.addListener(l):n.addEventListener(t,l,s),e.push([n,t,l,s])},input:function(n,t,l,s){this.add(n,t,(function(o){return function(a){a.nativeEvent&&(a=a.nativeEvent);var v=a.changedTouches||[],L=a.targetTouches||[],x=a.detail&&a.detail.x?a.detail:null;return o({id:x?x.identifier?x.identifier:"i":L[0]?L[0]?L[0].identifier:"e":"d",idChanged:x?x.identifier?x.identifier:"i":v[0]?v[0]?v[0].identifier:"e":"d",raw:a,x:x&&x.x?x.x:L[0]?L[0].screenX:x?x.x:a.pageX,y:x&&x.y?x.y:L[0]?L[0].screenY:x?x.y:a.pageY})}})(l),s)},purge:function(){e.forEach((function(n){n[0].removeListener?n[0].removeListener(n[2]):n[0].removeEventListener(n[1],n[2],n[3])})),e=[]}}}function pe(e,n,t){return Math.min(Math.max(e,n),t)}function G(e){return(e>0?1:0)-(e<0?1:0)||+e}function he(e){var n=e.getBoundingClientRect();return{height:me(n.height,e.offsetHeight),width:me(n.width,e.offsetWidth)}}function D(e,n,t,l){var s=e&&e[n];return s==null?t:l&&typeof s=="function"?s():s}function Y(e){return Math.round(1e6*e)/1e6}function Ie(e){var n,t,l,s,o,a;function v(c){a||(a=c),L(!0);var i=c-a;i>l&&(i=l);var d=s[t];if(d[3]<i)return t++,v(c);var b=d[2],I=d[4],f=d[0],u=d[1]*(0,d[5])(I===0?1:(i-b)/I);if(u&&e.track.to(f+u),i<l)return r();a=null,L(!1),x(null),e.emit("animationEnded")}function L(c){n.active=c}function x(c){n.targetIdx=c}function r(){var c;c=v,o=window.requestAnimationFrame(c)}function y(){var c;c=o,window.cancelAnimationFrame(c),L(!1),x(null),a&&e.emit("animationStopped"),a=null}return n={active:!1,start:function(c){if(y(),e.track.details){var i=0,d=e.track.details.position;t=0,l=0,s=c.map((function(b){var I,f=Number(d),u=(I=b.earlyExit)!==null&&I!==void 0?I:b.duration,m=b.easing,A=b.distance*m(u/b.duration)||0;d+=A;var M=l;return l+=u,i+=A,[f,b.distance,M,l,b.duration,m]})),x(e.track.distToIdx(i)),r(),e.emit("animationStarted")}},stop:y,targetIdx:null}}function Be(e){var n,t,l,s,o,a,v,L,x,r,y,c,i,d,b=1/0,I=[],f=null,u=0;function m(k){O(u+k)}function A(k){var h=M(u+k).abs;return B(h)?h:null}function M(k){var h=Math.floor(Math.abs(Y(k/t))),p=Y((k%t+t)%t);p===t&&(p=0);var T=G(k),E=v.indexOf(Le([],v).reduce((function(H,F){return Math.abs(F-p)<Math.abs(H-p)?F:H}))),C=E;return T<0&&h++,E===a&&(C=0,h+=T>0?1:-1),{abs:C+h*a*T,origin:E,rel:C}}function S(k,h,p){var T;if(h||!_())return g(k,p);if(!B(k))return null;var E=M(p??u),C=E.abs,H=k-E.rel,F=C+H;T=g(F);var q=g(F-a*G(H));return(q!==null&&Math.abs(q)<Math.abs(T)||T===null)&&(T=q),Y(T)}function g(k,h){if(h==null&&(h=Y(u)),!B(k)||k===null)return null;k=Math.round(k);var p=M(h),T=p.abs,E=p.rel,C=p.origin,H=z(k),F=(h%t+t)%t,q=v[C],U=Math.floor((k-(T-E))/a)*t;return Y(q-F-q+v[H]+U+(C===a?t:0))}function B(k){return N(k)===k}function N(k){return pe(k,x,r)}function _(){return s.loop}function z(k){return(k%a+a)%a}function O(k){var h;h=k-u,I.push({distance:h,timestamp:ge()}),I.length>6&&(I=I.slice(-6)),u=Y(k);var p=w().abs;if(p!==f){var T=f!==null;f=p,T&&e.emit("slideChanged")}}function w(k){var h=k?null:(function(){if(a){var p=_(),T=p?(u%t+t)%t:u,E=(p?u%t:u)-o[0][2],C=0-(E<0&&p?t-Math.abs(E):E),H=0,F=M(u),q=F.abs,U=F.rel,ae=o[U][2],ie=o.map((function(W,we){var $=C+H;($<0-W[0]||$>1)&&($+=(Math.abs($)>t-1&&p?t:0)*G(-$));var ue=we-U,fe=G(ue),te=ue+q;p&&(fe===-1&&$>ae&&(te+=a),fe===1&&$<ae&&(te-=a),y!==null&&te<y&&($+=t),c!==null&&te>c&&($-=t));var be=$+W[0]+W[1],Te=Math.max($>=0&&be<=1?1:be<0||$>1?0:$<0?Math.min(1,(W[0]+$)/W[0]):(1-$)/W[0],0);return H+=W[0]+W[1],{abs:te,distance:s.rtl?-1*$+1-W[0]:$,portion:Te,size:W[0]}}));return q=N(q),U=z(q),{abs:N(q),length:l,max:d,maxIdx:r,min:i,minIdx:x,position:u,progress:p?T/t:u/l,rel:U,slides:ie,slidesLength:t}}})();return n.details=h,e.emit("detailsChanged"),h}return n={absToRel:z,add:m,details:null,distToIdx:A,idxToDist:S,init:function(k){if((function(){if(s=e.options,o=(s.trackConfig||[]).map((function(E){return[D(E,"size",1),D(E,"spacing",0),D(E,"origin",0)]})),a=o.length){t=Y(o.reduce((function(E,C){return E+C[0]+C[1]}),0));var p,T=a-1;l=Y(t+o[0][2]-o[T][0]-o[T][2]-o[T][1]),v=o.reduce((function(E,C){if(!E)return[0];var H=o[E.length-1],F=E[E.length-1]+(H[0]+H[2])+H[1];return F-=C[2],E[E.length-1]>F&&(F=E[E.length-1]),F=Y(F),E.push(F),(!p||p<F)&&(L=E.length-1),p=F,E}),null),l===0&&(L=0),v.push(Y(t))}})(),!a)return w(!0);var h;(function(){var p=e.options.range,T=e.options.loop;y=x=T?D(T,"min",-1/0):0,c=r=T?D(T,"max",b):L;var E=D(p,"min",null),C=D(p,"max",null);E!==null&&(x=E),C!==null&&(r=C),i=x===-1/0?x:e.track.idxToDist(x||0,!0,0),d=r===b?r:S(r,!0,0),C===null&&(c=r),D(p,"align",!1)&&r!==b&&o[z(r)][2]===0&&(d-=1-o[z(r)][0],r=A(d-u)),i=Y(i),d=Y(d)})(),h=k,Number(h)===h?m(g(N(k))):w()},to:O,velocity:function(){var k=ge(),h=I.reduce((function(p,T){var E=T.distance,C=T.timestamp;return k-C>200||(G(E)!==G(p.distance)&&p.distance&&(p={distance:0,lastTimestamp:0,time:0}),p.time&&(p.distance+=E),p.lastTimestamp&&(p.time+=C-p.lastTimestamp),p.lastTimestamp=C),p}),{distance:0,lastTimestamp:0,time:0});return h.distance/h.time||0}}}function Ce(e){var n,t,l,s,o,a,v,L;function x(f){return 2*f}function r(f){return pe(f,v,L)}function y(f){return 1-Math.pow(1-f,3)}function c(){return l?e.track.velocity():0}function i(){I();var f=e.options.mode==="free-snap",u=e.track,m=c();s=G(m);var A=e.track.details,M=[];if(m||!f){var S=d(m),g=S.dist,B=S.dur;if(B=x(B),g*=s,f){var N=u.idxToDist(u.distToIdx(g),!0);N&&(g=N)}M.push({distance:g,duration:B,easing:y});var _=A.position,z=_+g;if(z<o||z>a){var O=z<o?o-_:a-_,w=0,k=m;if(G(O)===s){var h=Math.min(Math.abs(O)/Math.abs(g),1),p=(function(C){return 1-Math.pow(1-C,1/3)})(h)*B;M[0].earlyExit=p,k=m*(1-h)}else M[0].earlyExit=0,w+=O;var T=d(k,100),E=T.dist*s;e.options.rubberband&&(M.push({distance:E,duration:x(T.dur),easing:y}),M.push({distance:-E+w,duration:500,easing:y}))}e.animator.start(M)}else e.moveToIdx(r(A.abs),!0,{duration:500,easing:function(C){return 1+--C*C*C*C*C}})}function d(f,u){u===void 0&&(u=1e3);var m=147e-9+(f=Math.abs(f))/u;return{dist:Math.pow(f,2)/m,dur:f/m}}function b(){var f=e.track.details;f&&(o=f.min,a=f.max,v=f.minIdx,L=f.maxIdx)}function I(){e.animator.stop()}e.on("updated",b),e.on("optionsChanged",b),e.on("created",b),e.on("dragStarted",(function(){l=!1,I(),n=t=e.track.details.abs})),e.on("dragChecked",(function(){l=!0})),e.on("dragEnded",(function(){var f=e.options.mode;f==="snap"&&(function(){var u=e.track,m=e.track.details,A=m.position,M=G(c());(A>a||A<o)&&(M=0);var S=n+M;m.slides[u.absToRel(S)].portion===0&&(S-=M),n!==t&&(S=t),G(u.idxToDist(S,!0))!==M&&(S+=M),S=r(S);var g=u.idxToDist(S,!0);e.animator.start([{distance:g,duration:500,easing:function(B){return 1+--B*B*B*B*B}}])})(),f!=="free"&&f!=="free-snap"||i()})),e.on("dragged",(function(){t=e.track.details.abs}))}function Me(e){var n,t,l,s,o,a,v,L,x,r,y,c,i,d,b,I,f,u,m=Ee();function A(w){if(a&&L===w.id){var k=B(w);if(x){if(!g(w))return S(w);r=k,x=!1,e.emit("dragChecked")}if(I)return r=k;ne(w);var h=(function(T){if(f===-1/0&&u===1/0)return T;var E=e.track.details,C=E.length,H=E.position,F=pe(T,f-H,u-H);if(C===0)return 0;if(!e.options.rubberband)return F;if(H<=u&&H>=f||H<f&&t>0||H>u&&t<0)return T;var q=(H<f?H-f:H-u)/C,U=s*C,ae=Math.abs(q*U),ie=Math.max(0,1-ae/o*2);return ie*ie*T})(v(r-k)/s*l);t=G(h);var p=e.track.details.position;(p>f&&p<u||p===f&&t>0||p===u&&t<0)&&se(w),y+=h,!c&&Math.abs(y*s)>5&&(c=!0),e.track.add(h),r=k,e.emit("dragged")}}function M(w){!a&&e.track.details&&e.track.details.length&&(y=0,a=!0,c=!1,x=!0,L=w.id,g(w),r=B(w),e.emit("dragStarted"))}function S(w){a&&L===w.idChanged&&(a=!1,e.emit("dragEnded"))}function g(w){var k=N(),h=k?w.y:w.x,p=k?w.x:w.y,T=i!==void 0&&d!==void 0&&Math.abs(d-p)<=Math.abs(i-h);return i=h,d=p,T}function B(w){return N()?w.y:w.x}function N(){return e.options.vertical}function _(){s=e.size,o=N()?window.innerHeight:window.innerWidth;var w=e.track.details;w&&(f=w.min,u=w.max)}function z(w){c&&(se(w),ne(w))}function O(){if(m.purge(),e.options.drag&&!e.options.disabled){var w;w=e.options.dragSpeed||1,v=typeof w=="function"?w:function(h){return h*w},l=e.options.rtl?-1:1,_(),n=e.container,(function(){var h="data-keen-slider-clickable";oe("[".concat(h,"]:not([").concat(h,"=false])"),n).map((function(p){m.add(p,"dragstart",se),m.add(p,"mousedown",se),m.add(p,"touchstart",se)}))})(),m.add(n,"dragstart",(function(h){ne(h)})),m.add(n,"click",z,{capture:!0}),m.input(n,"ksDragStart",M),m.input(n,"ksDrag",A),m.input(n,"ksDragEnd",S),m.input(n,"mousedown",M),m.input(n,"mousemove",A),m.input(n,"mouseleave",S),m.input(n,"mouseup",S),m.input(n,"touchstart",M,{passive:!0}),m.input(n,"touchmove",A,{passive:!1}),m.input(n,"touchend",S),m.input(n,"touchcancel",S),m.add(window,"wheel",(function(h){a&&ne(h)}));var k="data-keen-slider-scrollable";oe("[".concat(k,"]:not([").concat(k,"=false])"),e.container).map((function(h){return(function(p){var T;m.input(p,"touchstart",(function(E){T=B(E),I=!0,b=!0}),{passive:!0}),m.input(p,"touchmove",(function(E){var C=N(),H=C?p.scrollHeight-p.clientHeight:p.scrollWidth-p.clientWidth,F=T-B(E),q=C?p.scrollTop:p.scrollLeft,U=C&&p.style.overflowY==="scroll"||!C&&p.style.overflowX==="scroll";if(T=B(E),(F<0&&q>0||F>0&&q<H)&&b&&U)return I=!0;b=!1,ne(E),I=!1})),m.input(p,"touchend",(function(){I=!1}))})(h)}))}}e.on("updated",_),e.on("optionsChanged",O),e.on("created",O),e.on("destroyed",m.purge)}function Se(e){var n,t,l=null;function s(i,d,b){e.animator.active?a(i,d,b):requestAnimationFrame((function(){return a(i,d,b)}))}function o(){s(!1,!1,t)}function a(i,d,b){var I=0,f=e.size,u=e.track.details;if(u&&n){var m=u.slides;n.forEach((function(A,M){if(i)!l&&d&&L(A,null,b),x(A,null,b);else{if(!m[M])return;var S=m[M].size*f;!l&&d&&L(A,S,b),x(A,m[M].distance*f-I,b),I+=S}}))}}function v(i){return e.options.renderMode==="performance"?Math.round(i):i}function L(i,d,b){var I=b?"height":"width";d!==null&&(d=v(d)+"px"),i.style["min-"+I]=d,i.style["max-"+I]=d}function x(i,d,b){if(d!==null){d=v(d);var I=b?d:0;d="translate3d(".concat(b?0:d,"px, ").concat(I,"px, 0)")}i.style.transform=d,i.style["-webkit-transform"]=d}function r(){n&&(a(!0,!0,t),n=null),e.on("detailsChanged",o,!0)}function y(){s(!1,!0,t)}function c(){r(),t=e.options.vertical,e.options.disabled||e.options.renderMode==="custom"||(l=D(e.options.slides,"perView",null)==="auto",e.on("detailsChanged",o),(n=e.slides).length&&y())}e.on("created",c),e.on("optionsChanged",c),e.on("beforeOptionsChanged",(function(){r()})),e.on("updated",y),e.on("destroyed",r)}function Ae(e,n){return function(t){var l,s,o,a,v,L=Ee();function x(g){var B;re(t.container,"reverse",(B=t.container,window.getComputedStyle(B,null).getPropertyValue("direction")!=="rtl"||g?null:"")),re(t.container,"v",t.options.vertical&&!g?"":null),re(t.container,"disabled",t.options.disabled&&!g?"":null)}function r(){y()&&I()}function y(){var g=null;if(a.forEach((function(N){N.matches&&(g=N.__media)})),g===l)return!1;l||t.emit("beforeOptionsChanged"),l=g;var B=g?o.breakpoints[g]:o;return t.options=ee(ee({},o),B),x(),M(),S(),u(),!0}function c(g){var B=he(g);return(t.options.vertical?B.height:B.width)/t.size||1}function i(){return t.options.trackConfig.length}function d(g){for(var B in l=!1,o=ee(ee({},n),g),L.purge(),s=t.size,a=[],o.breakpoints||[]){var N=window.matchMedia(B);N.__media=B,a.push(N),L.add(N,"change",r)}L.add(window,"orientationchange",A),L.add(window,"resize",m),y()}function b(g){t.animator.stop();var B=t.track.details;t.track.init(g??(B?B.abs:0))}function I(g){b(g),t.emit("optionsChanged")}function f(g,B){if(g)return d(g),void I(B);M(),S();var N=i();u(),i()!==N?I(B):b(B),t.emit("updated")}function u(){var g=t.options.slides;if(typeof g=="function")return t.options.trackConfig=g(t.size,t.slides);for(var B=t.slides,N=B.length,_=typeof g=="number"?g:D(g,"number",N,!0),z=[],O=D(g,"perView",1,!0),w=D(g,"spacing",0,!0)/t.size||0,k=O==="auto"?w:w/O,h=D(g,"origin","auto"),p=0,T=0;T<_;T++){var E=O==="auto"?c(B[T]):1/O-w+k,C=h==="center"?.5-E/2:h==="auto"?0:h;z.push({origin:C,size:E,spacing:w}),p+=E}if(p+=w*(_-1),h==="auto"&&!t.options.loop&&O!==1){var H=0;z.map((function(F){var q=p-H;return H+=F.size+w,q>=1||(F.origin=1-q-(p>1?0:1-p)),F}))}t.options.trackConfig=z}function m(){M();var g=t.size;t.options.disabled||g===s||(s=g,f())}function A(){m(),setTimeout(m,500),setTimeout(m,2e3)}function M(){var g=he(t.container);t.size=(t.options.vertical?g.height:g.width)||1}function S(){t.slides=oe(t.options.selector,t.container)}t.container=(v=oe(e,document)).length?v[0]:null,t.destroy=function(){L.purge(),t.emit("destroyed"),x(!0)},t.prev=function(){t.moveToIdx(t.track.details.abs-1,!0)},t.next=function(){t.moveToIdx(t.track.details.abs+1,!0)},t.update=f,d(t.options)}}var ke=function(e,n,t){try{return(function(l,s){var o,a={};return o={emit:function(v){a[v]&&a[v].forEach((function(x){x(o)}));var L=o.options&&o.options[v];L&&L(o)},moveToIdx:function(v,L,x){var r=o.track.idxToDist(v,L);if(r){var y=o.options.defaultAnimation;o.animator.start([{distance:r,duration:D(x||y,"duration",500),easing:D(x||y,"easing",(function(c){return 1+--c*c*c*c*c}))}])}},on:function(v,L,x){x===void 0&&(x=!1),a[v]||(a[v]=[]);var r=a[v].indexOf(L);r>-1?x&&delete a[v][r]:x||a[v].push(L)},options:l},(function(){if(o.track=Be(o),o.animator=Ie(o),s)for(var v=0,L=s;v<L.length;v++)(0,L[v])(o);o.track.init(o.options.initial||0),o.emit("created")})(),o})(n,Le([Ae(e,{drag:!0,mode:"snap",renderMode:"precision",rubberband:!0,selector:".keen-slider__slide"}),Se,Me,Ce],t||[],!0))}catch(l){console.error(l)}};const ye=ke.default||ke;let K=[],R=null,X=null,P="tones",J=null,Z=null,V=null,Q=null;function Ne(e){const n={ā:"a",á:"a",ǎ:"a",à:"a",ē:"e",é:"e",ě:"e",è:"e",ī:"i",í:"i",ǐ:"i",ì:"i",ō:"o",ó:"o",ǒ:"o",ò:"o",ū:"u",ú:"u",ǔ:"u",ù:"u",ǖ:"ü",ǘ:"ü",ǚ:"ü",ǜ:"ü"};return e.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g,t=>n[t])}function He(e){const n=e.replace("uu","ü").replace("v","ü").replace("lue","lüe").replace("nue","nüe"),t={a:"āáǎà",e:"ēéěè",i:"īíǐì",o:"ōóǒò",u:"ūúǔù",v:"ǖǘǚǜ",ü:"ǖǘǚǜ"};if(!n.slice(-1).match(/\d/))return n;try{const l=parseInt(n.slice(-1)),s=n.slice(0,-1);if(l===0||l===5)return s;let o=-1;for(const a of["a","e","o"])if(s.includes(a)){o=s.indexOf(a);break}if(o===-1){for(let a=s.length-1;a>=0;a--)if("iuvü".includes(s[a])){o=a;break}}if(o!==-1){let a=s[o];if(a==="v"&&(a="ü"),a in t)return s.slice(0,o)+t[a][l-1]+s.slice(o+1)}}catch{return n}return n}function j(e){const n=document.getElementById("app");n&&(n.className=n.className.replace(/bg-canvas-\w+/g,""),n.classList.add(e))}function Fe(){const e=document.getElementById("menu-screen"),n=document.getElementById("game-screen"),t=document.getElementById("audio-library-screen"),l=document.getElementById("main-menu"),s=document.getElementById("submenu"),o=document.getElementById("start-tones-btn"),a=document.getElementById("open-submenu-btn"),v=document.getElementById("close-submenu-btn"),L=document.getElementById("open-library-btn"),x=document.getElementById("back-to-main-menu-btn"),r=document.getElementById("start-initials-btn"),y=document.getElementById("start-endings-btn"),c=document.getElementById("back-to-menu-btn"),i=document.getElementById("engine-screen"),d=document.getElementById("open-engine-btn"),b=document.getElementById("back-from-engine-btn");d&&d.addEventListener("click",()=>{e.classList.add("hidden"),l.classList.remove("hidden"),s.classList.add("hidden"),i&&i.classList.remove("hidden"),j("bg-canvas-ice")}),b&&b.addEventListener("click",()=>{i&&i.classList.add("hidden"),e.classList.remove("hidden"),l.classList.remove("hidden"),j("bg-canvas-acid")}),a.addEventListener("click",()=>{l.classList.add("hidden"),s.classList.remove("hidden"),s.classList.add("flex"),j("bg-canvas-lavender")}),v.addEventListener("click",()=>{s.classList.add("hidden"),s.classList.remove("flex"),l.classList.remove("hidden"),j("bg-canvas-acid")}),L.addEventListener("click",()=>{e.classList.add("hidden"),l.classList.remove("hidden"),s.classList.add("hidden"),t.classList.remove("hidden"),j("bg-canvas-navy"),setTimeout(()=>{V&&V.update(),Q&&Q.update()},60)}),x.addEventListener("click",()=>{t.classList.add("hidden"),e.classList.remove("hidden"),l.classList.remove("hidden"),j("bg-canvas-acid")}),o.addEventListener("click",()=>ce("tones")),r.addEventListener("click",()=>ce("initials")),y.addEventListener("click",()=>ce("endings")),c.addEventListener("click",()=>{n.classList.add("hidden"),e.classList.remove("hidden"),P==="initials"||P==="endings"?(l.classList.add("hidden"),s.classList.remove("hidden"),s.classList.add("flex"),j("bg-canvas-lavender")):(s.classList.add("hidden"),s.classList.remove("flex"),l.classList.remove("hidden"),j("bg-canvas-acid")),document.querySelector(".options").style.display="grid",document.getElementById("play-btn").style.transform="scale(1)",document.getElementById("feedback").innerHTML="[IDENTIFY THE CORRECT TONE CONTOUR]"})}function ce(e){P=e,document.getElementById("menu-screen").classList.add("hidden"),document.getElementById("game-screen").classList.remove("hidden");const n=document.getElementById("game-mode-badge");e==="tones"?(j("bg-canvas-mint"),n&&(n.textContent="DRILL // TONE TRAINER")):e==="initials"?(j("bg-canvas-butter"),n&&(n.textContent="DRILL // INITIALS (声母)")):e==="endings"&&(j("bg-canvas-pink"),n&&(n.textContent="DRILL // ENDINGS (韵母)")),de()}async function Oe(){try{const e=await fetch("/mandarin_tone_trainer/single_words.json");if(!e.ok)throw new Error("JSON not found in public folder");K=await e.json(),console.log("App Ready. Vocabulary loaded:",K.length),_e(),setTimeout(()=>{document.querySelectorAll(".tone-btn").forEach(n=>n.classList.remove("pop-up"))},1e3)}catch(e){console.error("Initialization error:",e)}}function le(){if(!R)return;X&&(X.pause(),X.currentTime=0);const e=`/mandarin_tone_trainer/${R.audio}`;X=new Audio(e),X.play().catch(n=>console.error("Audio failed:",n))}function Re(){document.querySelectorAll(".tone-btn").forEach((e,n)=>{e.addEventListener("click",t=>{const l=e.querySelector(".option-text"),s=(l?l.textContent:e.textContent||"").trim().toLowerCase();let o=!1;if(P==="tones"){const a=(R.pinyin_correct||"").trim().toLowerCase();s===a&&(o=!0)}else if(P==="initials"){const a=(R.initial||"").trim().toLowerCase();(s===a||s==="∅"&&a==="")&&(o=!0)}else if(P==="endings"){const a=(R.ending_base||"").trim().toLowerCase();s===a&&(o=!0)}if(o){document.getElementById("feedback").innerHTML='<span class="bg-black text-canvas-acid px-3 py-1 rounded-full border border-black font-mono font-bold text-xs uppercase shadow-hard-black tracking-wider animate-bounce">CORRECT! +1</span>',document.querySelector(".options").style.display="none";const a=document.getElementById("fab-container");a.innerHTML=`
          <div class="w-14 h-14 rounded-2xl bg-canvas-acid text-black border-2 border-black shadow-hard-black flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-3xl">check</span>
          </div>
        `,a.classList.remove("hidden"),document.getElementById("pinyin-display").innerHTML=`
            <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${R.hanzi}</div>
            <div class="font-speed font-black italic text-2xl sm:text-3xl text-black">${R.pinyin_correct}</div>
        `;const v=document.getElementById("explanation-box");let L="";if(P==="initials"||P==="endings"){const x=P==="initials"?R.initial||"∅":R.ending_base,r=P==="initials"?R.initial_explanation:R.final_explanation;L=`
                <div class="relative p-2 text-center">
                    <p class="font-mono text-xs sm:text-sm text-left text-black">
                        <strong class="font-speed font-black text-black">${x}:</strong> 
                        ${r}
                    </p>
                    <button id="next-question-btn" class="mt-3 px-5 py-2 rounded-full bg-black text-white hover:bg-badge-pink border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-hard-black flex items-center gap-2 mx-auto active-collapse transition-colors cursor-pointer">
                        <span>NEXT QUESTION</span>
                        <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            `,v.innerHTML=L,v.classList.remove("hidden"),document.getElementById("next-question-btn").addEventListener("click",de,{once:!0})}else setTimeout(de,1500)}else{document.getElementById("feedback").innerHTML='<span class="bg-badge-red text-white px-3 py-1 rounded-full border border-black font-mono font-bold text-xs uppercase shadow-hard-black tracking-wider">TRY AGAIN</span>';const a=document.getElementById("fab-container");a.innerHTML=`
          <div class="w-14 h-14 rounded-2xl bg-badge-red text-white border-2 border-black shadow-hard-black flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-3xl">close</span>
          </div>
        `,a.classList.remove("hidden"),setTimeout(()=>{a.classList.add("hidden")},1e3),le()}})}),document.getElementById("play-btn").addEventListener("click",le)}function de(){document.querySelector(".options").style.display="grid";const e=document.getElementById("play-btn");e.style.transform="scale(1)",document.getElementById("fab-container").classList.add("hidden"),document.getElementById("explanation-box").classList.add("hidden"),R=K[Math.floor(Math.random()*K.length)];const n=document.getElementById("pinyin-display"),t=document.querySelectorAll(".tone-btn");if(P==="tones"){n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${R.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black">${R.pinyin_base}</div>
      `;const l=["High","Rising","Dipping","Falling"];t.forEach((s,o)=>{s.querySelector(".option-text").textContent=R.tone_options[o];const a=s.querySelector(".tone-hint");a&&(a.textContent=l[o])})}else P==="initials"?(n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${R.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black flex items-end justify-center gap-1">
          <span class="inline-block w-6 md:w-8 border-b-4 border-black mb-1"></span>${R.ending_correct}
        </div>
      `,t.forEach((l,s)=>{l.querySelector(".option-text").textContent=R.initial_options[s]===""?"∅":R.initial_options[s];const o=l.querySelector(".tone-hint");o&&(o.textContent="")})):P==="endings"&&(n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${R.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black flex items-end justify-center gap-1">
          ${R.initial}<span class="inline-block w-8 md:w-12 border-b-4 border-black mb-1"></span>
        </div>
      `,t.forEach((l,s)=>{l.querySelector(".option-text").textContent=Ne(R.ending_options[s]);const o=l.querySelector(".tone-hint");o&&(o.textContent="")}));t.forEach(l=>{l.offsetWidth}),document.getElementById("feedback").innerHTML='<span class="text-white/80">[IDENTIFY THE TARGET SOUND]</span>',le()}function ve(e){let n=!1;e.on("created",()=>{e.container.addEventListener("wheel",t=>{if(t.preventDefault(),n)return;const l=t.deltaY;Math.abs(l)<8||(n=!0,l>0?e.next():e.prev(),setTimeout(()=>{n=!1},90))},{passive:!1})})}function _e(){const e=document.getElementById("initials-scroller"),n=document.getElementById("finals-scroller"),t=document.getElementById("library-tone-modal"),l=document.getElementById("modal-pinyin-display"),s=document.getElementById("close-modal-btn"),o=document.getElementById("library-selection-display"),a=document.getElementById("library-main-play-btn"),v=[...new Set(K.map(c=>c.initial))].sort(),L=[...new Set(K.map(c=>c.ending_base))].sort();e.innerHTML="",n.innerHTML="",v.forEach((c,i)=>{const d=document.createElement("div");d.className="keen-slider__slide flex items-center justify-center cursor-pointer select-none",d.dataset.index=i;const b=document.createElement("span");b.className="slide-label font-speed text-xl sm:text-2xl font-bold transition-all duration-150",b.textContent=c===""?"∅":c,d.appendChild(b),e.appendChild(d)}),L.forEach((c,i)=>{const d=document.createElement("div");d.className="keen-slider__slide flex items-center justify-center cursor-pointer select-none",d.dataset.index=i;const b=document.createElement("span");b.className="slide-label font-speed text-xl sm:text-2xl font-bold transition-all duration-150",b.textContent=c,d.appendChild(b),n.appendChild(d)});function x(c,i){if(!c.track||!c.track.details)return;const d=c.track.details,b=c.container.querySelectorAll(".slide-label");d.slides.forEach((I,f)=>{const u=b[f];if(!u)return;const m=Math.abs(I.distance);m<.5?(u.style.opacity="1",u.style.transform=`scale(${1.2-m*.15})`,u.style.color=i==="initial"?"#000000":"#104FE2",u.style.fontWeight="900"):m<1.5?(u.style.opacity="0.6",u.style.transform="scale(0.95)",u.style.color="#000000",u.style.fontWeight="700"):m<2.5?(u.style.opacity="0.35",u.style.transform="scale(0.85)",u.style.color="#000000",u.style.fontWeight="600"):(u.style.opacity="0.15",u.style.transform="scale(0.75)",u.style.color="#000000",u.style.fontWeight="500")})}function r(){if(!V||!Q||!V.track||!Q.track||!V.track.details||!Q.track.details)return;const c=V.track.details.rel,i=Q.track.details.rel;J=v[c],Z=L[i];const d=J==="∅"?"":J,b=d+Z,I=K.filter(f=>f.initial===d&&f.ending_base===Z);I.length>0?(o.innerHTML=`
                <span class="font-chinese font-black text-2xl sm:text-3xl text-black">${b}</span>
                <span class="ml-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider font-bold bg-black text-canvas-acid px-2 py-0.5 rounded border border-black shadow-sm">
                  ${I.length} TONE${I.length>1?"S":""}
                </span>
            `,a.disabled=!1):(o.innerHTML=`
                <span class="font-chinese text-2xl font-bold text-black/30 line-through">${b}</span>
                <span class="ml-2 font-mono text-xs uppercase tracking-wider text-badge-red font-black">(No syllable)</span>
            `,a.disabled=!0)}V=new ye(e,{vertical:!0,mode:"free-snap",rubberband:!0,slides:{origin:"center",perView:7,spacing:0},initial:0,created(c){x(c,"initial")},detailsChanged(c){x(c,"initial")},slideChanged(){r()}},[ve]),Q=new ye(n,{vertical:!0,mode:"free-snap",rubberband:!0,slides:{origin:"center",perView:7,spacing:0},initial:0,created(c){x(c,"final")},detailsChanged(c){x(c,"final")},slideChanged(){r()}},[ve]),e.addEventListener("click",c=>{const i=c.target.closest(".keen-slider__slide");if(i&&V){const d=parseInt(i.dataset.index);V.moveToIdx(d,!0,{duration:250})}}),n.addEventListener("click",c=>{const i=c.target.closest(".keen-slider__slide");if(i&&Q){const d=parseInt(i.dataset.index);Q.moveToIdx(d,!0,{duration:250})}});function y(){(!J||!Z)&&r();const c=J==="∅"?"":J,i=c+Z;l.textContent=i,t.querySelectorAll(".tone-select-btn").forEach((b,I)=>{const f=I+1,u=He(`${i}${f}`);b.textContent=u,K.find(A=>A.initial===c&&A.ending_base===Z&&A.tone===f)?(b.disabled=!1,b.classList.remove("opacity-30","cursor-not-allowed","pointer-events-none"),b.classList.add("hover:bg-white","cursor-pointer")):(b.disabled=!0,b.classList.add("opacity-30","cursor-not-allowed","pointer-events-none"),b.classList.remove("hover:bg-white","cursor-pointer"))}),t.classList.remove("hidden")}a.addEventListener("click",y),s.addEventListener("click",()=>{t.classList.add("hidden")}),t.addEventListener("click",c=>{const i=c.target.closest(".tone-select-btn");if(i&&!i.disabled){const d=parseInt(i.dataset.tone),b=J==="∅"?"":J,I=K.find(f=>f.initial===b&&f.ending_base===Z&&f.tone===d);if(I){X&&X.pause();const f=`/mandarin_tone_trainer/${I.audio}`;X=new Audio(f),X.play().catch(u=>console.error("Audio failed:",u))}else console.warn(`No audio found for ${b}${Z}${d}`)}}),setTimeout(r,50)}window.addEventListener("keydown",e=>{const n=document.getElementById("game-screen"),t=document.getElementById("engine-screen");if(n&&!n.classList.contains("hidden"))if(e.key>="1"&&e.key<="4"){const l=parseInt(e.key)-1,s=document.querySelectorAll(".tone-btn")[l];s&&document.querySelector(".options").style.display!=="none"&&s.click()}else e.code==="Space"&&(e.preventDefault(),le());else if(t&&!t.classList.contains("hidden")&&e.code==="Space"){e.preventDefault();const l=document.getElementById("engine-record-btn");l&&l.click()}});function ze(){const e=document.getElementById("engine-record-btn"),n=document.getElementById("engine-next-btn"),t=document.getElementById("engine-reset-btn"),l=document.getElementById("coach-hear-user-btn"),s=document.getElementById("engine-step-counter"),o=[{syllablesCount:2,hanzi:"你 好",pinyin:"nǐ hǎo",gloss:"Hello",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ní hǎo"},{syllablesCount:1,hanzi:"妈",pinyin:"mā",gloss:"Mother",sandhi:"/ Tone 1: High Level 55 /",spoken:"mā"},{syllablesCount:3,hanzi:"对 不 起",pinyin:"duì bu qǐ",gloss:"Sorry",sandhi:"/ 4th + Neutral + 3rd /",spoken:"duì bu qǐ"},{syllablesCount:2,hanzi:"可 以",pinyin:"kě yǐ",gloss:"Can / May",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ké yǐ"},{syllablesCount:1,hanzi:"好",pinyin:"hǎo",gloss:"Good",sandhi:"/ Tone 3: Low-Dipping 214 /",spoken:"hǎo"},{syllablesCount:3,hanzi:"冰 淇 淋",pinyin:"bīng qí lín",gloss:"Ice Cream",sandhi:"/ 1st + 2nd + 2nd /",spoken:"bīng qí lín"},{syllablesCount:2,hanzi:"水 果",pinyin:"shuǐ guǒ",gloss:"Fruit",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"shuí guǒ"},{syllablesCount:3,hanzi:"没 关 系",pinyin:"méi guān xi",gloss:"It's Okay",sandhi:"/ 2nd + 1st + Neutral /",spoken:"méi guān xi"},{syllablesCount:1,hanzi:"马",pinyin:"mǎ",gloss:"Horse",sandhi:"/ Tone 3: Low-Dipping 214 /",spoken:"mǎ"},{syllablesCount:2,hanzi:"手 表",pinyin:"shǒu biǎo",gloss:"Watch",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"shóu biǎo"}];let a=!1,v=0;function L(r,y){document.querySelectorAll("#engine-syllable-toggle-group button").forEach((T,E)=>{E+1===r?T.className="px-2 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer":T.className="px-2 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer"});let i=y;i||(r===1?i={syllablesCount:1,hanzi:"妈",pinyin:"mā",gloss:"Mother",sandhi:"/ Tone 1: High Level 55 /",spoken:"mā"}:r===3?i={syllablesCount:3,hanzi:"对 不 起",pinyin:"duì bu qǐ",gloss:"Sorry",sandhi:"/ 4th + Neutral + 3rd /",spoken:"duì bu qǐ"}:i={syllablesCount:2,hanzi:"你 好",pinyin:"nǐ hǎo",gloss:"Hello",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ní hǎo"});const d=document.getElementById("engine-hanzi-display"),b=document.getElementById("engine-pinyin-display"),I=document.getElementById("engine-gloss-display"),f=document.getElementById("engine-stage-label"),u=document.getElementById("engine-sandhi-badge"),m=document.getElementById("engine-arena-subtitle");d&&(d.textContent=i.hanzi),b&&(b.textContent=i.pinyin),I&&(I.textContent=`"${i.gloss}"`),r===1?(f&&(f.textContent="[STAGE 1: ISOLATED SYLLABLE]"),m&&(m.textContent="CHAO 5-LEVEL SINGLE-CONTOUR"),u&&(u.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Isolated Tone Profile</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${i.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${i.spoken}</span>
        `)):r===3?(f&&(f.textContent="[STAGE 3: 3-SYLLABLE & NEUTRAL TONE]"),m&&(m.textContent="CHAO 5-LEVEL TRIPLE-CONTOUR"),u&&(u.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Compound Rule Applied</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${i.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${i.spoken}</span>
        `)):(f&&(f.textContent="[STAGE 2: TONE SANDHI]"),m&&(m.textContent="CHAO 5-LEVEL DUAL-CONTOUR"),u&&(u.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Sandhi Rule Applied</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${i.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${i.spoken}</span>
        `));const A=document.getElementById("pitch-chart-wrapper"),M=document.getElementById("pitch-chart-svg"),S=document.getElementById("pitch-grid-levels"),g=document.getElementById("pitch-syllable-dividers"),B=document.getElementById("pitch-target-ribbons"),N=document.getElementById("user-pitch-paths-container"),_=document.getElementById("user-pitch-points-container"),z=document.getElementById("engine-live-waveform-group"),O=document.getElementById("pitch-time-milestones"),w=document.getElementById("pitch-timeline-fill"),k=document.getElementById("pitch-timeline-text");if(r===1){A&&(A.className="flex gap-1.5 items-center justify-center max-w-[340px] sm:max-w-[380px] mx-auto transition-all duration-300"),M&&M.setAttribute("viewBox","0 0 350 155"),S&&(S.innerHTML=`
          <line x1="15" y1="15" x2="335" y2="15" />
          <line x1="15" y1="46" x2="335" y2="46" />
          <line x1="15" y1="78" x2="335" y2="78" />
          <line x1="15" y1="110" x2="335" y2="110" />
          <line x1="15" y1="140" x2="335" y2="140" />
        `),g&&(g.innerHTML="");const T=i.sandhi&&i.sandhi.includes("Dipping");B&&(T?B.innerHTML=`
            <polygon id="target-ribbon-s1" points="40,105 160,146 310,48 310,30 160,126 40,85" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `:B.innerHTML=`
            <polygon id="target-ribbon-s1" points="40,22 310,22 310,8 40,8" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),N&&(T?N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 40,95 Q 160,142 310,40" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `:N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 40,15 Q 175,13 310,15" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),_&&(T?_.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="40" cy="95" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="100" cy="118" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="160" cy="142" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="235" cy="95" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="310" cy="40" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `:_.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="40" cy="15" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="95" cy="14" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="150" cy="13" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="205" cy="13" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="260" cy="14" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="310" cy="15" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `),z&&(z.innerHTML=`
          <path d="M 30,80 Q 70,50 110,80 T 190,80 T 270,80 T 320,80" fill="none" stroke="#FF5C1C" stroke-width="3" stroke-linecap="round" class="animate-pulse" />
          <text x="175" y="75" class="font-mono text-xs font-black fill-badge-tangerine" text-anchor="middle">CAPTURING VOCAL SPECTRUM...</text>
        `),O&&(O.innerHTML=`
          <text x="40" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
          <text x="175" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[${i.pinyin}] ~320ms</text>
          <text x="310" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.32s</text>
        `),w&&(w.style.width="55%"),k&&(k.textContent="0.18s / 0.32s")}else A&&(A.className="flex gap-1.5 items-center justify-center w-full transition-all duration-300"),M&&M.setAttribute("viewBox","0 0 660 155"),S&&(S.innerHTML=`
          <line x1="20" y1="15" x2="640" y2="15" />
          <line x1="20" y1="46" x2="640" y2="46" />
          <line x1="20" y1="78" x2="640" y2="78" />
          <line x1="20" y1="110" x2="640" y2="110" />
          <line x1="20" y1="140" x2="640" y2="140" />
        `),z&&(z.innerHTML=`
          <path d="M 50,80 Q 90,50 130,80 T 210,80 T 290,80 T 370,80 T 450,80 T 530,80 T 610,80" fill="none" stroke="#FF5C1C" stroke-width="3" stroke-linecap="round" class="animate-pulse" />
          <text x="330" y="75" class="font-mono text-xs font-black fill-badge-tangerine" text-anchor="middle">CAPTURING VOCAL SPECTRUM...</text>
        `),r===3?(g&&(g.innerHTML=`
            <line x1="225" y1="8" x2="225" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="231" y="20" class="font-mono text-[8px] fill-black/60 font-black">SYL 2 [bu] ➔</text>
            <line x1="435" y1="8" x2="435" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="441" y="20" class="font-mono text-[8px] fill-black/60 font-black">SYL 3 [qǐ] ➔</text>
          `),B&&(B.innerHTML=`
            <polygon id="target-ribbon-s1" points="35,16 195,135 195,115 35,6" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s2" points="245,95 405,102 405,86 245,80" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s3" points="455,98 535,146 625,56 625,38 535,126 455,78" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),N&&(N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 35,18 Q 115,70 195,126" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s2" d="M 245,90 Q 325,92 405,96" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s3" d="M 455,92 Q 535,142 625,48" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),_&&(_.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="35" cy="18" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="115" cy="70" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="195" cy="126" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
            <g id="user-pitch-points-s2">
              <circle cx="245" cy="90" r="4" fill="#FDF197" stroke="#000" stroke-width="2" />
              <circle cx="325" cy="92" r="4" fill="#FF5C1C" stroke="#000" stroke-width="2" />
              <circle cx="405" cy="96" r="4" fill="#FF5C1C" stroke="#000" stroke-width="2" />
            </g>
            <g id="user-pitch-points-s3">
              <circle cx="455" cy="92" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="535" cy="142" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="625" cy="48" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `),O&&(O.innerHTML=`
            <text x="35" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
            <text x="115" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[duì]</text>
            <text x="195" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.28s</text>
            <text x="245" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.30s</text>
            <text x="325" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[bu]</text>
            <text x="405" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.46s</text>
            <text x="455" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.48s</text>
            <text x="540" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[qǐ]</text>
            <text x="625" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.85s</text>
          `),w&&(w.style.width="55%"),k&&(k.textContent="0.46s / 0.85s")):(g&&(g.innerHTML=`
            <line x1="330" y1="8" x2="330" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="336" y="20" class="font-mono text-[9px] fill-black/60 font-black">SYLLABLE 2 [hǎo] ➔</text>
          `),B&&(B.innerHTML=`
            <polygon id="target-ribbon-s1" points="70,95 300,28 300,10 70,75" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s2" points="360,98 470,146 600,52 600,32 470,126 360,78" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),N&&(N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 70,85 Q 180,54 300,48" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s2" d="M 360,88 Q 465,138 600,45" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),_&&(_.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="70" cy="85" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="120" cy="70" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="180" cy="58" r="4.5" fill="#FDF197" stroke="#000" stroke-width="2" />
              <circle cx="240" cy="50" r="5" fill="#FF5C1C" stroke="#000" stroke-width="2" />
              <circle cx="300" cy="48" r="5" fill="#FF5C1C" stroke="#000" stroke-width="2" />
            </g>
            <g id="user-pitch-points-s2">
              <circle cx="360" cy="88" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="410" cy="112" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="465" cy="138" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="530" cy="90" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="600" cy="45" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `),O&&(O.innerHTML=`
            <text x="70" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
            <text x="180" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[Initial: n] [Final: í]</text>
            <text x="300" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.32s</text>
            <text x="360" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.34s</text>
            <text x="480" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[Initial: h] [Final: ǎo]</text>
            <text x="600" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.72s</text>
          `),w&&(w.style.width="45%"),k&&(k.textContent="0.32s / 0.72s"));const h=document.getElementById("phonetic-audit-grid");h&&(r===1?(h.className="grid grid-cols-1 max-w-sm sm:max-w-md mx-auto gap-2",h.innerHTML=`
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 1: [${i.pinyin}]</span>
              <span class="font-mono text-[9px] font-black text-black bg-canvas-acid px-1.5 py-0.2 rounded border border-black">ACCURATE CONTOUR</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">INITIAL: m</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">96%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Clean</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">FINAL: a</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">92%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Exact</span>
              </div>
              <div class="bg-canvas-acid/40 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black font-black">TONE: 1</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">98%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ 55 Flat</span>
              </div>
            </div>
          </div>
        `):r===3?(h.className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2",h.innerHTML=`
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-[11px] uppercase text-black">SYL 1: [duì]</span>
              <span class="font-mono text-[8px] font-black text-black bg-canvas-acid px-1 rounded border border-black">✓ 4TH</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">INIT: d</span>
                <span class="font-speed font-black text-xs text-black">91%</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">FIN: ui</span>
                <span class="font-speed font-black text-xs text-black">88%</span>
              </div>
              <div class="bg-canvas-acid/40 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black font-black">TONE: 4</span>
                <span class="font-speed font-black text-xs text-black">94%</span>
              </div>
            </div>
          </div>

          <div class="bg-white border-[2.5px] border-black rounded-xl p-2 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-[11px] uppercase text-black">SYL 2: [bu]</span>
              <span class="font-mono text-[8px] font-black text-white bg-badge-tangerine px-1 rounded border border-black">⚠ STRESSED</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">INIT: b</span>
                <span class="font-speed font-black text-xs text-black">89%</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">FIN: u</span>
                <span class="font-speed font-black text-xs text-black">92%</span>
              </div>
              <div class="bg-badge-tangerine/15 border border-badge-tangerine rounded-lg p-0.5">
                <span class="block text-[8px] text-badge-tangerine font-black">NEUTRAL</span>
                <span class="font-speed font-black text-xs text-badge-tangerine">62%</span>
              </div>
            </div>
          </div>

          <div class="bg-white border-[2.5px] border-black rounded-xl p-2 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-[11px] uppercase text-black">SYL 3: [qǐ]</span>
              <span class="font-mono text-[8px] font-black text-black bg-canvas-acid px-1 rounded border border-black">✓ 3RD</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">INIT: q</span>
                <span class="font-speed font-black text-xs text-black">85%</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">FIN: i</span>
                <span class="font-speed font-black text-xs text-black">90%</span>
              </div>
              <div class="bg-canvas-acid/40 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black font-black">TONE: 3</span>
                <span class="font-speed font-black text-xs text-black">93%</span>
              </div>
            </div>
          </div>
        `):(h.className="grid grid-cols-1 sm:grid-cols-2 gap-2",h.innerHTML=`
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 1: [ní]</span>
              <span class="font-mono text-[9px] font-black text-white bg-badge-tangerine px-1.5 py-0.2 rounded border border-black">TONE DIVERGENCE</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">INITIAL: n</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">94%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Clean</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">FINAL: i</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">90%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Exact</span>
              </div>
              <div class="bg-badge-tangerine/15 border-2 border-badge-tangerine rounded-lg p-1">
                <span class="block text-[8px] text-badge-tangerine font-black">TONE: 2</span>
                <span class="font-speed font-black text-xs sm:text-sm text-badge-tangerine">61%</span>
                <span class="block text-[8px] text-badge-tangerine font-bold">⚠ Flat</span>
              </div>
            </div>
          </div>

          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 2: [hǎo]</span>
              <span class="font-mono text-[9px] font-black text-black bg-canvas-acid px-1.5 py-0.2 rounded border border-black">ACCURATE CONTOUR</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">INITIAL: h</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">89%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Clean</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">FINAL: ao</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">85%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Open</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">TONE: 3</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">94%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Dipped</span>
              </div>
            </div>
          </div>
        `));const p=document.getElementById("coach-advice-text");p&&(r===1?p.innerHTML='"Laser-flat pitch! Keep your voice steady at <strong class="bg-black text-white px-1.5 py-0.5 rounded">Level 5 (55)</strong> without letting it drift down at the end."':r===3?p.innerHTML=`"On the neutral tone <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">'bu'</strong>, keep it ultra-brief (~100ms) and light. Do not stress or lengthen it—it should bounce smoothly into <em class="text-badge-cobalt font-black">'qǐ'</em>."`:p.innerHTML=`"You flattened out too early on <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">'ní'</strong>. Keep your pitch climbing all the way to the top, like asking a surprised question: <em class="text-badge-cobalt font-black">'Really?!'</em>"`)}function x(r){v=Math.max(0,Math.min(r,o.length-1));const y=o[v];y&&L(y.syllablesCount,y),s&&(s.textContent=`STEP ${v+1} / ${o.length}`)}n&&n.addEventListener("click",()=>{const r=(v+1)%o.length;x(r)}),t&&t.addEventListener("click",()=>{x(0),window.PronunciationEngine&&window.PronunciationEngine.setRevealState(1)}),l&&l.addEventListener("click",()=>{const r=l.innerHTML;l.innerHTML='<span class="material-symbols-outlined text-sm animate-spin">sync</span> PLAYING USER TRACK...',l.classList.add("bg-badge-tangerine","text-white"),setTimeout(()=>{l.innerHTML=r,l.classList.remove("bg-badge-tangerine","text-white")},1200)}),e&&e.addEventListener("click",()=>{a=!a;const r=e.querySelector("span:nth-child(2)"),y=e.querySelector("span:nth-child(1)");a?(e.classList.replace("bg-badge-tangerine","bg-black"),e.classList.add("text-badge-tangerine"),e.classList.remove("text-white"),r&&(r.textContent="LISTENING... (TAP TO STOP)"),y&&y.classList.add("bg-badge-tangerine","scale-125")):(e.classList.replace("bg-black","bg-badge-tangerine"),e.classList.remove("text-badge-tangerine"),e.classList.add("text-white"),r&&(r.textContent="TAP TO RETRY"),y&&y.classList.remove("bg-badge-tangerine","scale-125"))}),window.PronunciationEngine={setRevealState(r){const y=document.getElementById("user-voice-track-group"),c=document.getElementById("engine-live-waveform-group"),i=document.getElementById("phonetic-audit-section"),d=document.getElementById("articulatory-coach-card");document.querySelectorAll("#engine-state-toggle-group button").forEach((I,f)=>{(f===0?1:f===1?2:4)===r?I.className="px-1.5 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer":I.className="px-1.5 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer"}),r===1?(y&&y.classList.add("hidden"),c&&c.classList.add("hidden"),i&&i.classList.add("hidden"),d&&d.classList.add("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">TAP TO RECORD</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `)):r===2?(y&&y.classList.add("hidden"),c&&c.classList.remove("hidden"),i&&i.classList.add("hidden"),d&&d.classList.add("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-black text-badge-tangerine border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-badge-tangerine animate-ping border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">RECORDING...</span>
            <span class="font-mono text-[10px] bg-badge-tangerine text-black px-1.5 py-0.5 rounded hidden sm:inline">[STOP]</span>
          `)):(y&&y.classList.remove("hidden"),c&&c.classList.add("hidden"),i&&i.classList.remove("hidden"),d&&d.classList.remove("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">TAP TO RETRY</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `))},setSyllableCount(r,y){L(r,y)},setTargetWord(r){r.syllablesCount?L(r.syllablesCount,r):(r.hanzi&&(document.getElementById("engine-hanzi-display").textContent=r.hanzi),r.pinyin&&(document.getElementById("engine-pinyin-display").textContent=r.pinyin),r.gloss&&(document.getElementById("engine-gloss-display").textContent=`"${r.gloss}"`))},selectWordIndex(r){x(r)},updateUserCurves({pathS1:r,pathS2:y,pathS3:c}){if(r){const i=document.getElementById("user-pitch-path-s1");i&&i.setAttribute("d",r)}if(y){const i=document.getElementById("user-pitch-path-s2");i&&i.setAttribute("d",y)}if(c){const i=document.getElementById("user-pitch-path-s3");i&&i.setAttribute("d",c)}},updateTargetRibbons({pointsS1:r,pointsS2:y,pointsS3:c}){if(r){const i=document.getElementById("target-ribbon-s1");i&&i.setAttribute("points",r)}if(y){const i=document.getElementById("target-ribbon-s2");i&&i.setAttribute("points",y)}if(c){const i=document.getElementById("target-ribbon-s3");i&&i.setAttribute("points",c)}},setCoachingAdvice(r){const y=document.getElementById("coach-advice-text");y&&(y.innerHTML=r)}}}Re();Fe();ze();Oe();
