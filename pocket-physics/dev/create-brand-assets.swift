// Run from the project root: swift dev/create-brand-assets.swift
// AppKit is used only at authoring time; the website has no asset-generation dependency.
import AppKit
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat((hex >> 16) & 255)/255, green: CGFloat((hex >> 8) & 255)/255, blue: CGFloat(hex & 255)/255, alpha: alpha)
}
let navy = color(0x263462), paper = color(0xf4f5f8), pink = color(0xff48b0), lemon = color(0xffe800)
func path(_ points: [CGPoint], close: Bool = false) -> NSBezierPath {
    let p = NSBezierPath(); p.move(to: points[0]); for point in points.dropFirst() { p.line(to: point) }; if close { p.close() }; return p
}
func stroke(_ p: NSBezierPath, _ c: NSColor, _ width: CGFloat) { c.setStroke(); p.lineWidth = width; p.lineCapStyle = .round; p.lineJoinStyle = .round; p.stroke() }
func fill(_ p: NSBezierPath, _ c: NSColor) { c.setFill(); p.fill() }
func ellipse(_ rect: CGRect) -> NSBezierPath { NSBezierPath(ovalIn: rect) }
func savePNG(_ name: String, width: Int, height: Int, draw: () -> Void) {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: width*4, bitsPerPixel: 32)!
    NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current!.imageInterpolation = .high
    let cg = NSGraphicsContext.current!.cgContext; cg.translateBy(x: 0, y: CGFloat(height)); cg.scaleBy(x: 1, y: -1)
    draw(); NSGraphicsContext.restoreGraphicsState()
    try! rep.representation(using: .png, properties: [:])!.write(to: root.appendingPathComponent(name))
}
func mark(_ x: CGFloat, _ y: CGFloat, _ size: CGFloat, tile: Bool) {
    NSGraphicsContext.saveGraphicsState(); let cg = NSGraphicsContext.current!.cgContext; cg.translateBy(x: x, y: y); cg.scaleBy(x: size/64, y: size/64)
    if tile { fill(NSBezierPath(roundedRect: CGRect(x:0,y:0,width:64,height:64), xRadius:17,yRadius:17), navy) }
    let ink = tile ? paper : navy
    stroke(ellipse(CGRect(x:10,y:10,width:44,height:44)), ink, 2.5)
    stroke(path([CGPoint(x:22,y:44),CGPoint(x:43,y:18),CGPoint(x:24,y:18)]), ink, 3)
    stroke(path([CGPoint(x:43,y:18),CGPoint(x:43,y:42)]), ink, 3)
    fill(ellipse(CGRect(x:20,y:14,width:8,height:8)), pink)
    NSGraphicsContext.restoreGraphicsState()
}
for size in [16,32,48,180] {
    let name = size == 180 ? "assets/apple-touch-icon.png" : "assets/favicon-\(size).png"
    savePNG(name, width:size, height:size) { if size == 180 { fill(NSBezierPath(rect:CGRect(x:0,y:0,width:180,height:180)),navy) }; mark(0,0,CGFloat(size),tile:true) }
}
savePNG("assets/og.png", width:1200, height:630) {
    fill(NSBezierPath(rect: CGRect(x:0,y:0,width:1200,height:630)), paper)
    // Flip only the type back to AppKit's text coordinate system.
    NSGraphicsContext.saveGraphicsState(); let cg = NSGraphicsContext.current!.cgContext; cg.translateBy(x:0,y:630); cg.scaleBy(x:1,y:-1)
    let title: [NSAttributedString.Key:Any] = [.font:NSFont.systemFont(ofSize:70,weight:.medium),.foregroundColor:navy,.kern:-3.0]
    ("pocket physics" as NSString).draw(at:CGPoint(x:66,y:460),withAttributes:title)
    NSGraphicsContext.restoreGraphicsState()
    mark(1056,64,80,tile:false)
    // Four authored silhouettes, each in its room's pigment pair.
    // Reverse hourglass: a continuous glass neck with upward pink grains.
    NSGraphicsContext.saveGraphicsState(); cg.translateBy(x:195,y:378); cg.rotate(by:-0.16)
    let glass=NSBezierPath();glass.move(to:CGPoint(x:-65,y:-118));glass.line(to:CGPoint(x:65,y:-118));glass.curve(to:CGPoint(x:12,y:0),controlPoint1:CGPoint(x:65,y:-50),controlPoint2:CGPoint(x:12,y:-38));glass.curve(to:CGPoint(x:65,y:118),controlPoint1:CGPoint(x:12,y:38),controlPoint2:CGPoint(x:65,y:50));glass.line(to:CGPoint(x:-65,y:118));glass.curve(to:CGPoint(x:-12,y:0),controlPoint1:CGPoint(x:-65,y:50),controlPoint2:CGPoint(x:-12,y:38));glass.curve(to:CGPoint(x:-65,y:-118),controlPoint1:CGPoint(x:-12,y:-38),controlPoint2:CGPoint(x:-65,y:-50));glass.close()
    fill(glass,color(0x0078bf,0.035));stroke(glass,color(0x3255a4),2.5)
    fill(path([CGPoint(x:-52,y:-103),CGPoint(x:52,y:-103),CGPoint(x:0,y:-35)],close:true),pink)
    fill(path([CGPoint(x:-44,y:104),CGPoint(x:44,y:104),CGPoint(x:0,y:77)],close:true),color(0xff48b0,0.65))
    for i in 0..<9 { let x=CGFloat((i*13)%9-4); let y=CGFloat(i*9-20); fill(ellipse(CGRect(x:x,y:y,width:3,height:3)),pink) }
    stroke(ellipse(CGRect(x:-65,y:-124,width:130,height:12)),color(0x3255a4,0.6),1.2)
    NSGraphicsContext.restoreGraphicsState()
    // Bubble: mint glass, violet perimeter and a broad restrained reflection.
    let bubble=ellipse(CGRect(x:360,y:275,width:230,height:230))
    NSGradient(colors:[color(0xffffff),color(0x82d8d5,0.3),color(0x82d8d5,0.7)])!.draw(in:bubble,angle:55)
    stroke(bubble,color(0x765ba7,0.75),1.5)
    let highlight=NSBezierPath();highlight.move(to:CGPoint(x:382,y:365));highlight.curve(to:CGPoint(x:453,y:291),controlPoint1:CGPoint(x:389,y:326),controlPoint2:CGPoint(x:415,y:299));stroke(highlight,.white,5)
    let small=ellipse(CGRect(x:543,y:249,width:72,height:72));fill(small,color(0x82d8d5,0.25));stroke(small,color(0x765ba7,0.6),1.2)
    // Fourth-dimensional mirror: optical disc and a genuine projected cube pairing.
    let mirror=ellipse(CGRect(x:650,y:255,width:242,height:242));fill(mirror,navy);stroke(mirror,lemon,2)
    let outer=[CGPoint(x:695,y:313),CGPoint(x:818,y:288),CGPoint(x:853,y:403),CGPoint(x:732,y:451)]
    let inner=[CGPoint(x:741,y:341),CGPoint(x:794,y:331),CGPoint(x:811,y:386),CGPoint(x:755,y:407)]
    stroke(path(outer,close:true),color(0xffe800,0.23),2);stroke(path(inner,close:true),color(0xffe800,0.23),2)
    for i in 0..<4 {stroke(path([outer[i],inner[i]]),color(0xacbce0,0.23),1.2)}
    fill(path([CGPoint(x:748,y:375),CGPoint(x:740,y:427),CGPoint(x:760,y:429),CGPoint(x:767,y:412),CGPoint(x:779,y:414),CGPoint(x:787,y:429),CGPoint(x:800,y:427),CGPoint(x:791,y:374)],close:true),color(0x82d8d5))
    fill(ellipse(CGRect(x:740,y:320,width:61,height:64)),lemon)
    fill(ellipse(CGRect(x:755,y:344,width:4,height:8)),navy);fill(ellipse(CGRect(x:782,y:344,width:4,height:8)),navy)
    let smile=NSBezierPath();smile.move(to:CGPoint(x:761,y:362));smile.curve(to:CGPoint(x:779,y:362),controlPoint1:CGPoint(x:765,y:369),controlPoint2:CGPoint(x:774,y:369));stroke(smile,navy,1.6)
    // Singing liquid: blue reflective wave, with its orange edge.
    let base=ellipse(CGRect(x:915,y:371,width:233,height:123));fill(base,color(0x005785));stroke(base,color(0xff801e),1.7)
    let liquid=NSBezierPath();liquid.move(to:CGPoint(x:915,y:418));liquid.curve(to:CGPoint(x:971,y:366),controlPoint1:CGPoint(x:914,y:396),controlPoint2:CGPoint(x:943,y:371));liquid.curve(to:CGPoint(x:1032,y:327),controlPoint1:CGPoint(x:1004,y:367),controlPoint2:CGPoint(x:1004,y:295));liquid.curve(to:CGPoint(x:1090,y:370),controlPoint1:CGPoint(x:1056,y:359),controlPoint2:CGPoint(x:1068,y:358));liquid.curve(to:CGPoint(x:1148,y:418),controlPoint1:CGPoint(x:1127,y:379),controlPoint2:CGPoint(x:1148,y:395));liquid.curve(to:CGPoint(x:915,y:418),controlPoint1:CGPoint(x:1148,y:493),controlPoint2:CGPoint(x:915,y:493));liquid.close()
    NSGradient(colors:[color(0x5ec8e5),color(0x0078bf),color(0x005785)])!.draw(in:liquid,angle:85)
    let reflection=NSBezierPath();reflection.move(to:CGPoint(x:976,y:390));reflection.curve(to:CGPoint(x:1024,y:333),controlPoint1:CGPoint(x:1006,y:389),controlPoint2:CGPoint(x:1004,y:321));stroke(reflection,color(0xe5f9ff,0.85),2.5)
}
print("Created favicon PNGs and 1200 × 630 Open Graph artwork.")

// ICO contains PNG payloads at three real sizes, including the 16 px browser-tab size.
func little32(_ value: UInt32) -> Data { var v=value.littleEndian; return withUnsafeBytes(of:&v) { Data($0) } }
let sizes=[16,32,48]
let images=sizes.map { try! Data(contentsOf:root.appendingPathComponent("assets/favicon-\($0).png")) }
var ico=Data([0,0,1,0,3,0]),offset=6+16*sizes.count
for (i,size) in sizes.enumerated() {
    ico.append(contentsOf:[UInt8(size),UInt8(size),0,0,1,0,32,0]);ico.append(little32(UInt32(images[i].count)));ico.append(little32(UInt32(offset)));offset+=images[i].count
}
for image in images { ico.append(image) }
try! ico.write(to:root.appendingPathComponent("favicon.ico"))
