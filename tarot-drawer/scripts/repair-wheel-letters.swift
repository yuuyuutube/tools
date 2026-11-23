// Add only the eight missing outer-ring letters. No erase, recolour or redraw.
// swiftc -module-cache-path /tmp/tarot-swift-cache scripts/repair-wheel-letters.swift -o /tmp/repair-wheel-letters
// /tmp/repair-wheel-letters /absolute/path/to/tarot-drawer
import AppKit
let root=URL(fileURLWithPath:CommandLine.arguments[1])
let folder=root.appendingPathComponent("docs/tarot-sunburst/letter-repair-2026-11-23")
let source=root.appendingPathComponent("docs/tarot-sunburst/light-paint/10-wheel-of-fortune-ink-transparent.png")
let backup=folder.appendingPathComponent("before/10-wheel-of-fortune-ink-transparent.png")
// Always draw on the saved original so rerunning never thickens the lettering.
if !FileManager.default.fileExists(atPath:backup.path){try FileManager.default.copyItem(at:source,to:backup)}
let b=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1024,pixelsHigh:1536,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bitmapFormat:[],bytesPerRow:4096,bitsPerPixel:32)!
NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:b)
NSImage(contentsOf:backup)!.draw(in:NSRect(x:0,y:0,width:1024,height:1536))
let cg=NSGraphicsContext.current!.cgContext
cg.translateBy(x:0,y:1536);cg.scaleBy(x:4,y:-4)
cg.setStrokeColor(CGColor(red:30/255,green:40/255,blue:74/255,alpha:1));cg.setLineCap(.round);cg.setLineJoin(.round);cg.setLineWidth(1.25)
// Independent glyph paths avoid font substitution, bidi ordering and mirrored Hebrew.
let glyphs:[String:[[(Double,Double)]]]=[
 "T":[[(-4,-4),(4,-4)],[(0,-4),(0,4)]],
 "A":[[(-3.3,4),(0,-4),(3.3,4)],[(-2,1),(2,1)]],
 "R":[[(-3,4),(-3,-4),(1,-4),(3,-2.5),(3,-0.5),(1,1),(-3,1)],[(0,1),(3.2,4)]],
 "O":[[(-1.8,-4),(1.7,-4),(3,-2.3),(3,2.2),(1.6,4),(-1.6,4),(-3,2.2),(-3,-2.3),(-1.8,-4)]],
 "י":[[(-1.3,-2.5),(1.2,-2.5),(1.4,0),(0.3,1)]],
 "ה":[[(-3,-3),(3,-3),(3,3.5)],[(-3,-0.8),(-3,3.5)]],
 "ו":[[(-1.8,-3),(1,-3),(1,3.5)]]]
let positions:[(String,Double)]=[("T",0),("י",55),("A",90),("ה",145),("R",180),("ו",235),("O",270),("ה",325)]
for (letter,degrees) in positions {
 let angle=degrees*Double.pi/180
 cg.saveGState();cg.translateBy(x:127+54*sin(angle),y:183-54*cos(angle));cg.rotate(by:angle)
 if letter == "O" {cg.strokeEllipse(in:CGRect(x:-3,y:-4,width:6,height:8));cg.restoreGState();continue}
 for line in glyphs[letter]! {cg.beginPath();cg.move(to:CGPoint(x:line[0].0,y:line[0].1));for pt in line.dropFirst(){cg.addLine(to:CGPoint(x:pt.0,y:pt.1))};cg.strokePath()}
 cg.restoreGState()
}
NSGraphicsContext.restoreGraphicsState()
try b.representation(using:.png,properties:[:])!.write(to:source)
let preview=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1024,pixelsHigh:1536,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:4096,bitsPerPixel:32)!
NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:preview)
NSImage(contentsOf:root.appendingPathComponent("docs/tarot-sunburst/light-paint/10-wheel-of-fortune-colour.png"))!.draw(in:NSRect(x:0,y:0,width:1024,height:1536))
NSImage(contentsOf:source)!.draw(in:NSRect(x:0,y:0,width:1024,height:1536))
NSGraphicsContext.restoreGraphicsState()
try preview.representation(using:.png,properties:[:])!.write(to:root.appendingPathComponent("docs/tarot-sunburst/light-paint/10-wheel-of-fortune-preview.png"))
print("Added T/A/R/O + yod/he/vav/he to the original ink; colour untouched.")
// Contact sheet uses current production faces, not historical batch exports.
let faces=["fool","magician","high-priestess","empress","emperor","hierophant","lovers","chariot","strength","hermit","wheel-of-fortune","justice","hanged-man","death","temperance","devil","tower","star","moon","sun","judgement","world"]
let sheet=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1560,pixelsHigh:1360,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:sheet)
NSColor.white.setFill();NSRect(x:0,y:0,width:1560,height:1360).fill()
for (i,id) in faces.enumerated(){let x=i%8*195,y=1360-(i/8+1)*450;NSImage(contentsOf:root.appendingPathComponent("assets/faces/\(id).webp"))?.draw(in:NSRect(x:x+7,y:y+35,width:180,height:240));("\(i) \(id)" as NSString).draw(at:NSPoint(x:x+5,y:y+12),withAttributes:[.font:NSFont.systemFont(ofSize:12),.foregroundColor:NSColor.black])}
NSGraphicsContext.restoreGraphicsState();try sheet.representation(using:.png,properties:[:])!.write(to:folder.appendingPathComponent("all-current-faces.png"))
