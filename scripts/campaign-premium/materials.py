"""Generate review-only, non-customer-branded planning PDFs. No network calls."""
from pathlib import Path
from reportlab.platypus import Flowable,SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,Image,PageBreak
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("MyARI-Serif","/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"))
pdfmetrics.registerFont(TTFont("MyARI-Sans","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
from reportlab.lib.utils import ImageReader
root=Path(__file__).resolve().parents[2]
out=root/'private/campaign-materials';out.mkdir(parents=True,exist_ok=True)
materials={
'readiness-checklist':('Homebuying Readiness Checklist',[
('Your starting point',['Write down why a move matters to you and what can wait.','Separate essential needs from preferences.','Note a comfortable timeline and any lease or sale commitments.']),
('Prepare for an informed conversation',['Ask a licensed lender about eligibility, documented funds, total monthly costs and available loan options.','Collect relevant income, asset and identification documents securely; do not email sensitive documents casually.','List the cash reserves you want to preserve and costs you need explained.']),
('Choose a useful next step',['Select areas to research with reliable, current sources.','Identify commute, accessibility and household requirements without assumptions about neighborhoods.','Agree with your agent on a communication method and follow-up timing.'])]),
'commercial-planning':('Commercial Property Planning Guide',[
('Define the property brief',['Describe intended use, acquisition or leasing objectives, location requirements and timing.','List space, access, parking, loading, utilities and operational requirements.','Identify decision-makers, legal entities and approval responsibilities.']),
('Questions for qualified advisers',['Verify permitted use and zoning with the appropriate authority.','Ask legal and financial advisers about lease terms, operating costs, due diligence and obligations.','Review condition, environmental concerns, accessibility and specialist inspections as appropriate.']),
('Compare without assumptions',['Record the source and date for every property fact.','Separate asking terms from independently verified costs.','Do not rely on projected returns, occupancy or market claims without evidence.'])]),
'buyer-preparation':('Buyer Preparation Guide',[
('Shape a clear search',['List needs, preferred areas and the trade-offs you are willing to make.','Review financing questions with a licensed lender; pre-approval terms may change.','Plan a realistic schedule for viewing and evaluating properties.']),
('Before making a decision',['Verify listing details and material property information.','Discuss inspection, financing and other contingencies with your qualified advisers.','Ask for a written explanation of expected costs and contractual deadlines.']),
('Protect your next chapter',['Use a trusted channel to verify any wiring instructions independently.','Keep an organized record of documents, decisions and due dates.','Confirm possession, insurance and utility arrangements with the appropriate professionals.'])]),
'seller-preparation':('Home Selling Preparation Checklist',[
('Begin with your priorities',['Clarify your preferred timing, next housing plans and decision-makers.','Gather property records, warranties, permits and available maintenance information.','Ask your agent about required disclosures; seek legal advice where needed.']),
('Prepare the property thoughtfully',['Prioritize safety, maintenance and presentation before optional cosmetic work.','Discuss repairs, photography access and showing arrangements.','Protect valuables and personal information during marketing and visits.']),
('Build a supported strategy',['Review current, relevant property information rather than a guaranteed value estimate.','Ask how pricing, marketing, feedback and adjustments will be reviewed.','Compare offer terms, contingencies and timing with qualified guidance.'])]),
'homeowner-care':('Seasonal Homeowner Care Guide',[
('A practical seasonal review',['Check visible leaks, drainage, exterior wear and weather-related issues.','Follow manufacturer guidance for filters, equipment and maintenance intervals.','Arrange qualified servicing for electrical, roofing, HVAC or safety concerns.']),
('Keep useful records',['Maintain a secure list of service providers, warranties and repairs.','Review insurance questions directly with a licensed insurance professional.','Document improvements and ask tax or legal advisers about recordkeeping needs.']),
('Plan for the longer term',['Set your own maintenance priorities and ask qualified contractors for written estimates.','Review household needs before considering a renovation or future move.','Contact your real estate adviser when a property question would benefit from context.'])]),
'buyer-seller-planning':('Buyer & Seller Planning Guide',[
('If buying is on the horizon',['Identify household needs, timing and search priorities.','Discuss financing options and total costs with a licensed lender.','Plan how you will verify property details and evaluate homes.']),
('If selling is on the horizon',['Gather property information and clarify timing priorities.','Discuss preparation, disclosures and a supported marketing strategy.','Review potential terms, contingencies and closing steps with your advisers.']),
('If coordinating both',['Map the sequence of decisions and discuss contingency options.','Verify financing, possession and contractual deadlines independently.','Choose one clear next step and the professionals who can help you evaluate it.'])]),
'property-comparison':('Property Comparison Worksheet',[
('Record the basics',['Property address and authorized listing URL.','Source and date of price, dimensions, condition and listing status.','Questions requiring independent verification.']),
('Compare with your own priorities',['Record strengths, compromises and unanswered questions for each home.','Consider condition, accessibility, layout and ongoing costs with qualified advice.','Avoid treating illustrative estimates or unverified claims as property facts.']),
('Agree on a next step',['Identify additional documents or specialist advice needed.','Discuss whether a further visit, information request or pause would be useful.','Keep notes about your own requirements rather than assumptions about other buyers.'])])}
styles=getSampleStyleSheet();styles.add(ParagraphStyle(name='PremiumTitle',fontName='MyARI-Serif',fontSize=29,leading=32,textColor=colors.HexColor('#29241e'),spaceAfter=18));styles.add(ParagraphStyle(name='PremiumHeading',fontName='MyARI-Serif',fontSize=18,leading=22,textColor=colors.HexColor('#94623f'),spaceBefore=15,spaceAfter=9));styles.add(ParagraphStyle(name='PremiumBody',fontName='MyARI-Sans',fontSize=10.5,leading=16,textColor=colors.HexColor('#494943'),spaceAfter=9));styles.add(ParagraphStyle(name='PremiumSmall',fontName='MyARI-Sans',fontSize=8,leading=12,textColor=colors.HexColor('#776c60')))
def page(canvas,doc):
 canvas.saveState();canvas.setFillColor(colors.HexColor('#fcfaf5'));canvas.rect(0,0,612,792,fill=1,stroke=0);canvas.setStrokeColor(colors.HexColor('#c4a484'));canvas.line(45,64,567,64);canvas.setFont('MyARI-Sans',7);canvas.setFillColor(colors.HexColor('#71685f'));canvas.drawString(45,49,'MyARI | Shared planning draft | Review and approve before client use');canvas.drawRightString(567,49,str(doc.page));canvas.restoreState()
class Banner(Flowable):
 def __init__(self,filename):
  Flowable.__init__(self);self.filename=filename;self.width=522;self.height=150
 def draw(self):
  image=ImageReader(self.filename);w,h=image.getSize();scale=max(self.width/w,self.height/h)
  c=self.canv;c.saveState();p=c.beginPath();p.rect(0,0,self.width,self.height);c.clipPath(p,stroke=0);c.drawImage(image,(self.width-w*scale)/2,(self.height-h*scale)/2,width=w*scale,height=h*scale);c.restoreState()
photos=['properties.jpg','campaigns.jpg','contacts.jpg','mortgage.jpg','notes.jpg','dashboard.jpg','calendar.jpg']
for number,(key,(title,sections)) in enumerate(materials.items()):
 doc=SimpleDocTemplate(str(out/(key+'.pdf')),pagesize=(612,792),rightMargin=45,leftMargin=45,topMargin=40,bottomMargin=80,title=title,author='MyARI')
 photo=Banner(str(root/'public/brand/heroes'/photos[number]))
 story=[Paragraph('MyARI / THOUGHTFUL REAL ESTATE GUIDANCE',styles['PremiumSmall']),Spacer(1,14),Paragraph(title,styles['PremiumTitle']),photo,Spacer(1,14),Paragraph('A practical resource for an informed conversation. Work at your own pace and verify the details that matter to you.',styles['PremiumBody'])]
 for heading,items in sections[:2]:
  story.append(Paragraph(heading,styles['PremiumHeading']))
  story.extend(Paragraph('&#9633; '+item,styles['PremiumBody']) for item in items)
 story += [PageBreak(),Paragraph('Your planning notes',styles['PremiumTitle']),Paragraph(sections[2][0],styles['PremiumHeading'])]
 story.extend(Paragraph('&#9633; '+item,styles['PremiumBody']) for item in sections[2][1])
 rows=[['Priority or question','Source / next step','Responsible person']]+[['','',''] for _ in range(7)]
 t=Table(rows,colWidths=[190,205,127],rowHeights=[32]+[36]*7);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#eee3d3')),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#d7c9b8')),('FONTNAME',(0,0),(-1,-1),'MyARI-Sans'),('FONTSIZE',(0,0),(-1,-1),9),('TEXTCOLOR',(0,0),(-1,-1),colors.HexColor('#514638')),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
 story += [Spacer(1,18),t,Spacer(1,18),Paragraph('Agent / brokerage: __________________________<br/>Contact details: __________________________<br/>Required local and brokerage disclosures: __________________________',styles['PremiumBody']),Paragraph('Educational planning information only; not legal, tax, lending, engineering or investment advice. No property facts, valuation or outcomes are promised. Replace the blank branding and disclosure fields using an approved subscriber Brand Kit before sharing.',styles['PremiumSmall'])]
 doc.build(story,onFirstPage=page,onLaterPages=page)
print('Created 7 two-page PDF planning resources; no subscriber data used.')
