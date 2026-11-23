// Local hand-authored colour motifs. Only the moon is allowed an ink edit.
// swiftc -module-cache-path /tmp/tarot-swift-cache scripts/repair-colour-symbols.swift -o /tmp/repair-colour-symbols
import AppKit
import CryptoKit
let root=URL(fileURLWithPath:CommandLine.arguments[1]),fm=FileManager.default
let out=root.appendingPathComponent("docs/tarot-sunburst/symbol-details-2026-11-23")
try fm.createDirectory(at:out.appendingPathComponent("before"),withIntermediateDirectories:true)
let cards:[(Int,String)]=[(3,"empress"),(5,"hierophant"),(6,"lovers"),(7,"chariot"),(10,"wheel-of-fortune"),(14,"temperance"),(16,"tower"),(18,"moon")]
let navy=CGColor(red:30/255,green:40/255,blue:74/255,alpha:1),cream=CGColor(red:246/255,green:239/255,blue:224/255,alpha:1),red=CGColor(red:191/255,green:69/255,blue:47/255,alpha:1),gold=CGColor(red:232/255,green:183/255,blue:77/255,alpha:1)
func bitmap()->NSBitmapImageRep{let b=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1024,pixelsHigh:1536,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:4096,bitsPerPixel:32)!;memset(b.bitmapData!,0,b.bytesPerRow*b.pixelsHigh);return b}
func read(_ p:URL)->NSBitmapImageRep{NSBitmapImageRep(data:try! Data(contentsOf:p))!}
func backup(_ src:URL,_ name:String)throws{let p=out.appendingPathComponent("before/"+name);if !fm.fileExists(atPath:p.path){try fm.copyItem(at:src,to:p)}}
func save(_ b:NSBitmapImageRep,_ p:URL)throws{try b.representation(using:.png,properties:[:])!.write(to:p)}
func line(_ g:CGContext,_ pts:[(Double,Double)],_ color:CGColor,_ w:Double=0.8){g.setStrokeColor(color);g.setLineWidth(w);g.setLineCap(.round);g.setLineJoin(.round);g.beginPath();g.move(to:CGPoint(x:pts[0].0,y:pts[0].1));for p in pts.dropFirst(){g.addLine(to:CGPoint(x:p.0,y:p.1))};g.strokePath()}
func ellipse(_ g:CGContext,_ x:Double,_ y:Double,_ rx:Double,_ ry:Double,_ color:CGColor){g.setFillColor(color);g.fillEllipse(in:CGRect(x:x-rx,y:y-ry,width:rx*2,height:ry*2))}
func star(_ g:CGContext,_ x:Double,_ y:Double,_ r:Double,_ color:CGColor){g.setFillColor(color);g.beginPath();for i in 0..<10{let a=Double(i)*Double.pi/5-Double.pi/2,rr=i%2==0 ? r:r*0.43,p=CGPoint(x:x+cos(a)*rr,y:y+sin(a)*rr);if i==0{g.move(to:p)}else{g.addLine(to:p)}};g.closePath();g.fillPath()}
func flame(_ g:CGContext,_ x:Double,_ y:Double,_ s:Double){g.setFillColor(red);g.beginPath();g.move(to:CGPoint(x:x,y:y-s));g.addCurve(to:CGPoint(x:x+s*0.55,y:y+s*0.55),control1:CGPoint(x:x-s*0.2,y:y-s*0.1),control2:CGPoint(x:x+s,y:y));g.addCurve(to:CGPoint(x:x-s*0.5,y:y+s*0.55),control1:CGPoint(x:x+s*0.4,y:y+s),control2:CGPoint(x:x-s*0.5,y:y+s));g.addCurve(to:CGPoint(x:x,y:y-s),control1:CGPoint(x:x-s,y:y),control2:CGPoint(x:x+s*0.1,y:y-s*0.4));g.closePath();g.fillPath();ellipse(g,x,y+s*0.4,s*0.18,s*0.4,gold)}
func pomegranate(_ g:CGContext,_ x:Double,_ y:Double,_ s:Double){ellipse(g,x,y,s,s*1.05,red);line(g,[(x-s*0.6,y-s*0.9),(x-s*0.65,y-s*1.4),(x-s*0.2,y-s*1.15),(x,y-s*1.65),(x+s*0.2,y-s*1.15),(x+s*0.6,y-s*1.4),(x+s*0.55,y-s*0.9)],red,s*0.35);ellipse(g,x+s*0.1,y+s*0.12,s*0.56,s*0.67,cream);for (dx,dy) in [(-0.15,-0.15),(0.3,-0.1),(-0.2,0.3),(0.25,0.4)]{ellipse(g,x+s*dx,y+s*dy,s*0.13,s*0.15,red)}}
func rose(_ g:CGContext,_ x:Double,_ y:Double){for i in 0..<5{let a=Double(i)*2*Double.pi/5;ellipse(g,x+cos(a)*1.45,y+sin(a)*1.45,1.5,1.5,red)};line(g,[(x-0.8,y+0.6),(x-1,y-0.5),(x+0.2,y-1),(x+1,y),(x+0.2,y+0.5)],cream,0.45)}
func lily(_ g:CGContext,_ x:Double,_ y:Double){g.setFillColor(cream);for dx in [-2.3,0,2.3]{g.beginPath();g.move(to:CGPoint(x:x,y:y+2));g.addQuadCurve(to:CGPoint(x:x+dx,y:y-3.3),control:CGPoint(x:x+dx*1.9,y:y-0.5));g.addQuadCurve(to:CGPoint(x:x,y:y+2),control:CGPoint(x:x+dx*0.2,y:y-0.7));g.fillPath()};line(g,[(x,y+1),(x,y-1.5)],gold,0.5);ellipse(g,x,y-1.6,0.5,0.5,gold)}
var verification:[[String:Any]]=[]
for (n,id) in cards {
 let prefix=String(format:"%02d",n)+"-"+id,dir=root.appendingPathComponent("docs/tarot-sunburst/light-paint"),cp=dir.appendingPathComponent(prefix+"-colour.png"),np=dir.appendingPathComponent(prefix+"-ink-transparent.png"),pp=dir.appendingPathComponent(prefix+"-preview.png")
 try backup(cp,prefix+"-colour.png");try backup(np,prefix+"-ink-transparent.png");try backup(pp,prefix+"-preview.png");try backup(root.appendingPathComponent("assets/faces/"+id+".webp"),id+".webp")
 for key in ["paper","N","Y","O","B"] {try backup(root.appendingPathComponent("assets/reveal/\(n)-\(key).webp"),"\(n)-\(key).webp")}
 let c=read(out.appendingPathComponent("before/"+prefix+"-colour.png")),ink=read(out.appendingPathComponent("before/"+prefix+"-ink-transparent.png")),layer=bitmap()
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:layer);let g=NSGraphicsContext.current!.cgContext;g.translateBy(x:0,y:1536);g.scaleBy(x:4,y:-4)
 switch n {
 case 3:
  for (x,y,s) in [(120.0,151.0,2.4),(110,175,2.6),(121,198,2.7),(105,222,2.5),(132,237,2.7),(114,259,2.8),(143,260,2.4),(94,254,2.3)]{pomegranate(g,x,y,s)}
 case 5:
  for (x,y) in [(47.0,224.0),(58,234),(44,270),(62,283),(38,293)]{rose(g,x,y)}
  for (x,y) in [(194.0,225.0),(205,236),(195,265),(210,284),(187,294)]{lily(g,x,y)}
 case 6:
  var treeCenters:[[Double]]=[]
  func leaf(_ x:Double,_ y:Double)->Bool{let xx=Int(x*4),yy=Int(y*4);if xx<0 || xx>=1024 || yy<0 || yy>=1536{return false};let i=yy*c.bytesPerRow+xx*(c.bitsPerPixel/8),r=Double(c.bitmapData![i]),gg=Double(c.bitmapData![i+1]),b=Double(c.bitmapData![i+2]);return gg>r*0.93 && r>b*1.1 && b<145 && gg<190}
  for (x,y) in [(225.0,68.0),(235,77),(215,82),(237,99),(213,105),(225,114),(236,122),(213,127),(237,145)]{
   var best=(x,y),distance=Double.infinity
   for dy in -8...8{for dx in -8...8{let xx=x+Double(dx),yy=y+Double(dy),d=Double(dx*dx+dy*dy);if d<distance && leaf(xx,yy) && leaf(xx-1,yy) && leaf(xx+1,yy) && !treeCenters.contains(where:{hypot($0[0]-xx,$0[1]-yy)<4}){best=(xx,yy);distance=d}}}
   flame(g,best.0,best.1,3.0);treeCenters.append([best.0,best.1])
  }
  verification.append(["card":6,"flameClusters":12,"existingLargeFlames":3,"addedClusters":9,"centers":treeCenters])
 case 7:
  for (x,y) in [(85.0,53.0),(106,51),(128,51),(150,51),(171,53),(87,62),(105,65),(151,65),(169,62)]{star(g,x,y,2.05,cream)}
 case 10:
  // Dark colour coverage (not N-line edits) stays legible after halftoning.
  let symbolInk=CGColor(red:8/255,green:13/255,blue:26/255,alpha:1)
  // In the four inner quadrants, slightly beside the existing spokes.
  g.saveGState();g.translateBy(x:135,y:159)
  g.setStrokeColor(symbolInk);g.setLineWidth(0.9);g.strokeEllipse(in:CGRect(x:-2,y:-1,width:4,height:4));line(g,[(0,3),(0,6)],symbolInk,0.9);line(g,[(-1.5,4.5),(1.5,4.5)],symbolInk,0.9);line(g,[(-2,-4),(-1.5,-2),(0,-1),(1.5,-2),(2,-4)],symbolInk,0.9);g.restoreGState()
  g.saveGState();g.translateBy(x:151,y:191);g.rotate(by:Double.pi/2);line(g,[(0,-4),(-2.5,0),(2.5,0),(0,-4)],symbolInk,0.9);line(g,[(0,0),(0,5)],symbolInk,0.9);line(g,[(-2,3),(2,3)],symbolInk,0.9);g.restoreGState()
  g.saveGState();g.translateBy(x:119,y:207);g.rotate(by:Double.pi);line(g,[(-3,-2),(-1.5,-3),(0,-2),(1.5,-3),(3,-2)],symbolInk,0.9);line(g,[(-3,0),(-1.5,-1),(0,0),(1.5,-1),(3,0)],symbolInk,0.9);line(g,[(0,0),(0,4)],symbolInk,0.9);g.restoreGState()
  g.setStrokeColor(symbolInk);g.setLineWidth(0.9);g.strokeEllipse(in:CGRect(x:100.5,y:172.5,width:5,height:5));line(g,[(100.5,175),(105.5,175)],symbolInk,0.9)
 case 14:
  g.setStrokeColor(red);g.setLineWidth(0.65);g.strokeEllipse(in:CGRect(x:126.9,y:74.15,width:2.2,height:2.2));ellipse(g,128,75.25,0.35,0.35,gold)
 case 16:
  // Numbered coordinates; 12 left / 10 right, distinct from stone fragments.
  let left:[(Double,Double)]=[(76,67),(67,87),(82,98),(63,114),(79,129),(92,145),(48,164),(104,181),(40,180),(91,205),(48,225),(91,225)]
  let right:[(Double,Double)]=[(203,70),(211,89),(220,108),(196,123),(220,139),(191,151),(224,163),(224,180),(224,227),(185,225)]
  // Erase only connected gold-colour islands in sky; original ink, lightning,
  // tower windows, crown and stones are never erased.
  func pix(_ x:Int,_ y:Int)->(Int,Int,Int){let i=y*c.bytesPerRow+x*(c.bitsPerPixel/8);return (Int(c.bitmapData![i]),Int(c.bitmapData![i+1]),Int(c.bitmapData![i+2]))}
  var seen=Set<Int>(),removed=0
  for y in 240..<940 {for x in 200..<900 {let key=y*1024+x;if seen.contains(key){continue};let (r,gg,b)=pix(x,y);if !(r>170 && gg>120 && b<165 && r>b+55){continue};var q=[key],head=0;seen.insert(key)
   while head<q.count {let k=q[head];head+=1;let xx=k%1024,yy=k/1024;for (nx,ny) in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]{if nx<0 || nx>=1024 || ny<0 || ny>=1536{continue};let nk=ny*1024+nx;if seen.contains(nk){continue};let (rr,ggg,bb)=pix(nx,ny);if rr>170 && ggg>120 && bb<165 && rr>bb+55{seen.insert(nk);q.append(nk)}}}
   // Old dots are small disconnected flat islands. Preserve all larger art.
   if q.count<420 && q.count>3 {
    let mx=Double(q.reduce(0){$0+$1%1024})/Double(q.count)/4,my=Double(q.reduce(0){$0+$1/1024})/Double(q.count)/4
    if mx>112 && mx<138 && my>136 && my<201 {continue} // protect both window fires
let xx=q.map{$0%1024},yy=q.map{$0/1024};let minx=xx.min()!,maxx=xx.max()!,miny=yy.min()!,maxy=yy.max()!;let refx=max(0,minx-5),refy=miny;let base=pix(refx,refy)
    // Only replace with a sampled non-gold sky colour.
    if base.0<170 {for k in q{let i=(k/1024)*c.bytesPerRow+(k%1024)*(c.bitsPerPixel/8);c.bitmapData![i]=UInt8(base.0);c.bitmapData![i+1]=UInt8(base.1);c.bitmapData![i+2]=UInt8(base.2)};removed+=1}
    _=maxx;_=maxy
   }
  }}
  for (x,y) in left+right {g.saveGState();g.translateBy(x:x,y:y);g.setFillColor(gold);g.beginPath();g.move(to:CGPoint(x:0,y:-2.3));g.addCurve(to:CGPoint(x:1.3,y:1.3),control1:CGPoint(x:0.2,y:-0.3),control2:CGPoint(x:2,y:0));g.addCurve(to:CGPoint(x:-1.3,y:1.1),control1:CGPoint(x:0.5,y:2.7),control2:CGPoint(x:-1.7,y:2.4));g.addCurve(to:CGPoint(x:0,y:-2.3),control1:CGPoint(x:-2,y:0),control2:CGPoint(x:-0.1,y:-0.7));g.fillPath();g.restoreGState()}
  verification.append(["card":16,"newFireDrops":22,"left":left.map{[$0.0,$0.1]},"right":right.map{[$0.0,$0.1]},"oldColourIslandsRemoved":removed])
 case 18:
  let originalC=read(out.appendingPathComponent("before/"+prefix+"-colour.png")),originalN=read(out.appendingPathComponent("before/"+prefix+"-ink-transparent.png"))
  let skyIndex=240*originalC.bytesPerRow+240*(originalC.bitsPerPixel/8),sky=(0..<3).map{originalC.bitmapData![skyIndex+$0]}
  let cx=512.0,cy=356.0,oldR=163.0,newR=138.4
  // Keep all gold droplets outside the old disk, including those inside the ray zone.
  for y in 85..<635 {for x in 245..<780 {let dx=Double(x)-cx,dy=Double(y)-cy,r=hypot(dx,dy);if r>300{continue};let ci=y*c.bytesPerRow+x*(c.bitsPerPixel/8),ni=y*ink.bytesPerRow+x*(ink.bitsPerPixel/8),oi=y*originalC.bytesPerRow+x*(originalC.bitsPerPixel/8)
   if r<=newR {let sx=min(1023,max(0,Int(cx+dx*oldR/newR))),sy=min(1535,max(0,Int(cy+dy*oldR/newR))),sc=sy*originalC.bytesPerRow+sx*(originalC.bitsPerPixel/8),sn=sy*originalN.bytesPerRow+sx*(originalN.bitsPerPixel/8);for k in 0..<3{c.bitmapData![ci+k]=originalC.bitmapData![sc+k];ink.bitmapData![ni+k]=originalN.bitmapData![sn+k]};ink.bitmapData![ni+3]=originalN.bitmapData![sn+3]}
   else {let keepDrop=r>168 && y>=530 && originalC.bitmapData![oi]>150 && originalC.bitmapData![oi+1]>100 && originalC.bitmapData![oi+2]<165;for k in 0..<3{c.bitmapData![ci+k]=keepDrop ? originalC.bitmapData![oi+k]:sky[k]};ink.bitmapData![ni+3]=0}
  }}
  // Ink overlay is separate; moon face was resampled from the original, not redrawn.
  let il=bitmap();NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:il);let ig=NSGraphicsContext.current!.cgContext;ig.translateBy(x:0,y:1536);ig.scaleBy(x:4,y:-4);ig.setStrokeColor(navy);ig.setLineWidth(1.3);ig.strokeEllipse(in:CGRect(x:128-34.6,y:89-34.6,width:69.2,height:69.2))
  var rays:[[String:Any]]=[]
  for i in 0..<32 {let a=Double(i)*Double.pi/16-Double.pi/2,r=i%2==0 ? 43.0:39.0;let p0=(128+35.6*cos(a),89+35.6*sin(a)),p1=(128+r*cos(a),89+r*sin(a));line(ig,[p0,p1],navy,i%2==0 ? 1.25:0.9);rays.append(["index":i+1,"kind":i%2==0 ? "main":"secondary","tip":[p1.0,p1.1]])}
  NSGraphicsContext.restoreGraphicsState()
  for y in 0..<1536 {for x in 0..<1024 {let j=y*il.bytesPerRow+x*4,a=Int(il.bitmapData![j+3]);if a==0{continue};let i=y*ink.bytesPerRow+x*(ink.bitsPerPixel/8);let old=Int(ink.bitmapData![i+3]);for k in 0..<3{ink.bitmapData![i+k]=UInt8([30,40,74][k])};ink.bitmapData![i+3]=UInt8(min(255,a+old*(255-a)/255))}}
  verification.append(["card":18,"mainRays":16,"secondaryRays":16,"rays":rays,"moonScale":newR/oldR,"dropletsRetained":15])
 default:break
 }
 NSGraphicsContext.restoreGraphicsState()
 // Composite only nontransparent new colour marks onto the original RGB bytes.
 var colourPixels=0
 for y in 0..<1536 {for x in 0..<1024 {let j=y*layer.bytesPerRow+x*4,a=Int(layer.bitmapData![j+3]);if a==0{continue};let i=y*c.bytesPerRow+x*(c.bitsPerPixel/8);for k in 0..<3{let v=Int(layer.bitmapData![j+k])+Int(c.bitmapData![i+k])*(255-a)/255;c.bitmapData![i+k]=UInt8(min(255,v))};colourPixels+=1}}
 try save(c,cp)
 if n==18{try save(ink,np)}
 let preview=bitmap();NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:preview);let rect=NSRect(x:0,y:0,width:1024,height:1536);NSImage(contentsOf:cp)!.draw(in:rect);NSImage(contentsOf:np)!.draw(in:rect);NSGraphicsContext.restoreGraphicsState();try save(preview,pp)
 verification.append(["card":n,"id":id,"newColourMarkPixels":colourPixels,"inkUnchanged":n != 18])
 print("\(n) \(id) complete")
}
try JSONSerialization.data(withJSONObject:verification,options:[.prettyPrinted,.sortedKeys]).write(to:out.appendingPathComponent("construction.json"))
