import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outPath = path.join(rootDir, 'cognito-tax-client-intake-fillable.pdf');

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const COL_GAP = 16;
const LABEL_SIZE = 8.6;
const BODY_SIZE = 10;
const LINE_HEIGHT = 11;
const SECTION_FILL = rgb(0.91, 0.85, 0.76);
const BORDER = rgb(0.82, 0.76, 0.69);
const INK = rgb(0.12, 0.14, 0.16);
const MUTED = rgb(0.37, 0.42, 0.46);

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function drawWrapped(page, text, font, size, x, y, maxWidth, color = INK, lineHeight = LINE_HEIGHT) {
  const lines = wrapText(text, font, size, maxWidth);
  for (let i = 0; i < lines.length; i += 1) {
    page.drawText(lines[i], { x, y: y - i * lineHeight, size, font, color });
  }
  return lines.length * lineHeight;
}

function drawHeader(page, fontBold, font, title, subtitle) {
  page.drawRectangle({
    x: MARGIN,
    y: PAGE_H - MARGIN - 54,
    width: PAGE_W - MARGIN * 2,
    height: 54,
    color: rgb(1, 0.98, 0.95),
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 12,
  });
  page.drawText(title, {
    x: MARGIN + 14,
    y: PAGE_H - MARGIN - 28,
    size: 18,
    font: fontBold,
    color: INK,
  });
  page.drawText(subtitle, {
    x: MARGIN + 14,
    y: PAGE_H - MARGIN - 44,
    size: 9.2,
    font,
    color: MUTED,
  });
}

function drawSection(page, fontBold, title, x, y, width) {
  page.drawRectangle({
    x,
    y: y - 14,
    width,
    height: 18,
    color: SECTION_FILL,
    borderColor: BORDER,
    borderWidth: 0.5,
    borderRadius: 8,
  });
  page.drawText(title, {
    x: x + 8,
    y: y - 9,
    size: 7.8,
    font: fontBold,
    color: rgb(0.36, 0.23, 0.12),
  });
  return 22;
}

function createTextField(form, name, page, x, y, width, height, opts = {}) {
  const field = form.createTextField(name);
  field.enableScrolling();
  if (opts.multiline) field.enableMultiline();
  if (opts.file) {
    field.enableFileSelection();
  }
  if (opts.maxLength) field.setMaxLength(opts.maxLength);
  field.addToPage(page, {
    x,
    y,
    width,
    height,
    borderWidth: 1,
    borderColor: BORDER,
    color: rgb(1, 1, 1),
    textColor: INK,
  });
  return field;
}

function renderTextItem(page, form, fontBold, font, item, x, y, width) {
  const labelLines = wrapText(item.label, fontBold, LABEL_SIZE, width);
  const labelH = labelLines.length * 10;
  const inputH = item.multiline ? 54 : 24;
  const totalH = labelH + 8 + inputH + (item.hint ? 12 : 0);
  drawWrapped(page, item.label, fontBold, LABEL_SIZE, x, y, width, INK, 10);
  if (item.hint) {
    page.drawText(item.hint, { x, y: y - labelH - 2, size: 7.5, font, color: MUTED });
  }
  createTextField(form, item.name, page, x, y - labelH - 10 - (item.hint ? 10 : 0) - inputH, width, inputH, {
    multiline: item.multiline,
    file: item.file,
    fontSize: 9.4,
    maxLength: item.maxLength,
  });
  return totalH + 4;
}

function renderSelectItem(page, form, fontBold, font, item, x, y, width) {
  const labelLines = wrapText(item.label, fontBold, LABEL_SIZE, width);
  const labelH = labelLines.length * 10;
  drawWrapped(page, item.label, fontBold, LABEL_SIZE, x, y, width, INK, 10);
  const field = form.createDropdown(item.name);
  field.setOptions(item.options);
  field.addToPage(page, {
    x,
    y: y - labelH - 10 - 26,
    width,
    height: 26,
    borderWidth: 1,
    borderColor: BORDER,
    color: rgb(1, 1, 1),
    textColor: INK,
  });
  return labelH + 40;
}

function renderRadioItem(page, form, fontBold, font, item, x, y, width) {
  const labelLines = wrapText(item.label, fontBold, LABEL_SIZE, width);
  const labelH = labelLines.length * 10;
  drawWrapped(page, item.label, fontBold, LABEL_SIZE, x, y, width, INK, 10);
  const group = form.createRadioGroup(item.name);
  const optionY = y - labelH - 10 - 10;
  const optionW = item.options.length === 2 ? (width - 12) / 2 : width;
  if (item.options.length === 2) {
    item.options.forEach((opt, idx) => {
      group.addOptionToPage(opt, page, {
        x: x + idx * (optionW + 12),
        y: optionY,
        width: optionW,
        height: 16,
        borderWidth: 1,
        borderColor: BORDER,
        color: rgb(1, 1, 1),
        textColor: INK,
      });
    });
  } else {
    item.options.forEach((opt, idx) => {
      group.addOptionToPage(opt, page, {
        x,
        y: optionY - idx * 18,
        width,
        height: 16,
        borderWidth: 1,
        borderColor: BORDER,
        color: rgb(1, 1, 1),
        textColor: INK,
      });
    });
  }
  return labelH + (item.options.length === 2 ? 30 : 18 * item.options.length + 14);
}

function renderCheckboxItem(page, form, fontBold, font, item, x, y, width) {
  const labelLines = wrapText(item.label, fontBold, LABEL_SIZE, width);
  const labelH = labelLines.length * 10;
  drawWrapped(page, item.label, fontBold, LABEL_SIZE, x, y, width, INK, 10);
  const cb = form.createCheckBox(item.name);
  cb.addToPage(page, {
    x,
    y: y - labelH - 11,
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: BORDER,
    color: rgb(1, 1, 1),
    textColor: INK,
  });
  page.drawText(item.boxLabel || 'Agree', { x: x + 20, y: y - labelH - 7, size: 9.2, font, color: INK });
  return labelH + 24;
}

function renderChoiceList(page, fontBold, font, item, x, y, width, kind = 'checkbox') {
  const labelLines = wrapText(item.label, fontBold, LABEL_SIZE, width);
  const labelH = labelLines.length * 10;
  drawWrapped(page, item.label, fontBold, LABEL_SIZE, x, y, width, INK, 10);
  let currentY = y - labelH - 8;
  if (kind === 'checkbox') {
    const perRow = item.options.length > 3 ? 2 : 3;
    const colW = item.options.length > 1 ? (width - 12) / perRow : width;
    item.options.forEach((opt, idx) => {
      const col = idx % perRow;
      const row = Math.floor(idx / perRow);
      const ox = x + col * (colW + 12);
      const oy = currentY - row * 18;
      page.drawRectangle({ x: ox, y: oy - 2, width: 12, height: 12, borderColor: BORDER, borderWidth: 1, color: rgb(1, 1, 1) });
      page.drawText(opt, { x: ox + 18, y: oy, size: 9.2, font, color: INK });
    });
    return labelH + 18 * Math.ceil(item.options.length / perRow) + 10;
  }
  const perRow = item.options.length === 2 ? 2 : 3;
  const colW = item.options.length > 1 ? (width - 12) / perRow : width;
  item.options.forEach((opt, idx) => {
    const col = idx % perRow;
    const row = Math.floor(idx / perRow);
    const ox = x + col * (colW + 12);
    const oy = currentY - row * 18;
    page.drawCircle({ x: ox + 6, y: oy + 4, size: 5.2, borderColor: BORDER, borderWidth: 1, color: rgb(1, 1, 1) });
    page.drawText(opt, { x: ox + 18, y: oy, size: 9.2, font, color: INK });
  });
  return labelH + 18 * Math.ceil(item.options.length / perRow) + 10;
}

function renderField(page, form, fontBold, font, item, x, y, width) {
  if (item.kind === 'text') return renderTextItem(page, form, fontBold, font, item, x, y, width);
  if (item.kind === 'select') return renderSelectItem(page, form, fontBold, font, item, x, y, width);
  if (item.kind === 'radio') return renderRadioItem(page, form, fontBold, font, item, x, y, width);
  if (item.kind === 'checkbox') return renderCheckboxItem(page, form, fontBold, font, item, x, y, width);
  if (item.kind === 'choices') return renderChoiceList(page, fontBold, font, item, x, y, width, item.choiceKind || 'checkbox');
  if (item.kind === 'note') {
    const lines = wrapText(item.label, font, 9, width);
    drawWrapped(page, item.label, font, 9, x, y, width, MUTED, 10);
    return lines.length * 10 + 4;
  }
  return 0;
}

function layoutItems(page, form, fontBold, font, items, opts = {}) {
  const left = opts.left ?? MARGIN;
  const top = opts.top ?? PAGE_H - 92;
  const gap = opts.gap ?? COL_GAP;
  const width = opts.width ?? PAGE_W - MARGIN * 2;
  const colW = (width - gap) / 2;
  let y = top;
  let row = [];

  function flushRow() {
    if (!row.length) return;
    const rowHeight = Math.max(...row.map((cell) => cell.height));
    row.forEach((cell, idx) => {
      const x = cell.span === 2 ? left : left + idx * (colW + gap);
      const w = cell.span === 2 ? width : colW;
      renderField(page, form, fontBold, font, cell.item, x, y, w);
    });
    y -= rowHeight + 10;
    row = [];
  }

  for (const item of items) {
    const tempWidth = item.span === 2 ? width : colW;
    const estimated = item.height ?? estimateItemHeight(item, fontBold, tempWidth);
    if (item.span === 2) {
      flushRow();
      row.push({ item, height: estimated, span: 2 });
      flushRow();
      continue;
    }
    row.push({ item, height: estimated, span: 1 });
    if (row.length === 2) flushRow();
  }
  flushRow();
}

function estimateItemHeight(item, fontBold, width) {
  const labelLines = wrapText(item.label, fontBold, LABEL_SIZE, width).length;
  const labelH = labelLines * 10;
  if (item.kind === 'text') return labelH + (item.multiline ? 72 : 40) + 4;
  if (item.kind === 'select') return labelH + 40;
  if (item.kind === 'radio') return labelH + 34 + (item.options.length > 2 ? (item.options.length * 18) : 0);
  if (item.kind === 'checkbox') return labelH + 28;
  if (item.kind === 'choices') {
    const perRow = item.choiceKind === 'radio' ? (item.options.length === 2 ? 2 : 3) : (item.options.length > 3 ? 2 : 3);
    return labelH + 18 * Math.ceil(item.options.length / perRow) + 12;
  }
  if (item.kind === 'note') return wrapText(item.label, fontBold, 9, width).length * 10 + 4;
  return 40;
}

function addPageWithTitle(pdfDoc, fontBold, font, title, subtitle) {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.setFont(font);
  page.setFontColor(INK);
  drawHeader(page, fontBold, font, title, subtitle);
  return page;
}

function fillableText(label, kind = 'text', extra = {}) {
  return { kind, label, name: `${slug(label)}-${Math.random().toString(16).slice(2, 8)}`, ...extra };
}

async function main() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const form = pdfDoc.getForm();

  // Page 1
  let page = addPageWithTitle(pdfDoc, fontBold, font, '2025 Tax Client Intake Form', 'Page 1: Client Basics');
  page.drawText('Complete this form to ensure an accurate tax return. Organize your tax documents before starting. If a section does not apply, click "Next."', {
    x: MARGIN,
    y: PAGE_H - 112,
    size: 9.2,
    font,
    color: MUTED,
  });
  page.drawText('Contact Mr. Taxes Pro: (844)-552-1277 | info@mrtaxespro.com | 2701 W Oakland Park Blvd Suite 230 | Oakland Park FL 33311', {
    x: MARGIN,
    y: PAGE_H - 126,
    size: 8.4,
    font,
    color: MUTED,
  });
  layoutItems(page, form, fontBold, font, [
    { kind: 'text', label: 'How did you hear about us?', name: 'page1_referral_source' },
    { kind: 'text', label: 'Referred By:', name: 'page1_referred_by' },
    { kind: 'choices', label: 'What other services are you interested in?', options: ['Tax Planning Services', 'Life Insurance', 'Credit Repair'], choiceKind: 'checkbox' },
    { kind: 'text', label: "Today's Date", name: 'page1_today', extra: true },
    { kind: 'text', label: "Previous Year's Tax Return", name: 'page1_previous_return', file: true },
    { kind: 'select', label: 'Filing Status* (required)', options: ['Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household', 'Qualifying Surviving Spouse'], name: 'page1_filing_status' },
    { kind: 'text', label: 'Social Security Number* (required)', name: 'page1_ssn' },
    { kind: 'text', label: 'Upload Social Security Card(s)', name: 'page1_ss_cards', file: true },
    { kind: 'text', label: 'Name* (required)', name: 'page1_name' },
    { kind: 'text', label: 'Date of Birth* (required)', name: 'page1_dob' },
    { kind: 'text', label: 'Occupation* (required)', name: 'page1_occupation' },
    { kind: 'text', label: 'Mailing Address* (required)', name: 'page1_mailing_address', multiline: true },
    { kind: 'text', label: 'Phone* (required)', name: 'page1_phone' },
    { kind: 'text', label: 'Email* (required)', name: 'page1_email' },
    { kind: 'radio', label: 'Do you have an Identity Protection Pin (IP Pin) issued by the IRS?', options: ['Yes', 'No'], name: 'page1_ip_pin' },
    { kind: 'radio', label: 'Are you a U.S. Citizen or Green Card Holder?', options: ['Yes', 'No'], name: 'page1_citizen' },
    { kind: 'radio', label: 'Are you a full-time student?', options: ['Yes', 'No'], name: 'page1_student' },
    { kind: 'radio', label: 'Can another taxpayer claim you as a dependent?', options: ['Yes', 'No'], name: 'page1_dependent' },
    { kind: 'radio', label: 'Are you totally and permanently disabled?', options: ['Yes', 'No'], name: 'page1_disabled' },
    { kind: 'radio', label: 'ARE YOU CLAIMING ANY DEPENDENTS?', options: ['Yes', 'No'], name: 'page1_claiming_dependents' },
    { kind: 'radio', label: 'ARE YOU FILING WITH AN ELIGIBLE SPOUSE?', options: ['Yes', 'No'], name: 'page1_eligible_spouse' },
    { kind: 'text', label: 'ID/ DL Number* (required)', name: 'page1_dl_number' },
    { kind: 'text', label: 'State* (required)', name: 'page1_state' },
    { kind: 'text', label: 'Issue Date', name: 'page1_issue_date' },
    { kind: 'text', label: 'Expiration Date', name: 'page1_expiration_date' },
    { kind: 'text', label: 'Upload Photo ID/ Driver License (Front/ Back)* (required)', name: 'page1_dl_upload', file: true },
  ], { top: PAGE_H - 144 });

  // Page 2 and 3 placeholders
  page = addPageWithTitle(pdfDoc, fontBold, font, '2025 Tax Client Intake Form', 'Page 2');
  page.drawText('No visible questions were rendered in the live preview for this page.', { x: MARGIN, y: PAGE_H - 110, size: 10, font, color: MUTED });
  page.drawText('This appears to be a conditional/hidden step that does not show in the default public render.', {
    x: MARGIN,
    y: PAGE_H - 126,
    size: 9,
    font,
    color: MUTED,
  });

  page = addPageWithTitle(pdfDoc, fontBold, font, '2025 Tax Client Intake Form', 'Page 3');
  page.drawText('No visible questions were rendered in the live preview for this page.', { x: MARGIN, y: PAGE_H - 110, size: 10, font, color: MUTED });
  page.drawText('This appears to be a conditional/hidden step that does not show in the default public render.', {
    x: MARGIN,
    y: PAGE_H - 126,
    size: 9,
    font,
    color: MUTED,
  });

  // Page 4
  page = addPageWithTitle(pdfDoc, fontBold, font, '2025 Tax Client Intake Form', 'Page 4: Income and Expenses');
  layoutItems(page, form, fontBold, font, [
    { kind: 'choices', label: 'Please select all forms of income in the current tax year:', options: ['W-2 wages', '1099 income', 'Self-employment', 'Unemployment', 'Retirement', 'Other'], choiceKind: 'checkbox', span: 2 },
    { kind: 'text', label: 'Upload Income Documents* (required)', name: 'page4_income_docs', file: true },
    { kind: 'text', label: "Upload Income Documents (W2's, 1099's, etc.) IF YOU WORKED OVERTIME INCLUDE LAST PAYSTUB OF 2025", name: 'page4_income_docs_extra', file: true },
    { kind: 'choices', label: 'Please select which other expenses pertain to you:', options: ['Child care', 'Education', 'Medical', 'Charitable', 'Business', 'Other'], choiceKind: 'checkbox', span: 2 },
    { kind: 'text', label: 'Upload Expense Evidence', name: 'page4_expense_evidence', file: true },
    { kind: 'text', label: 'List any other details related to expenses.', name: 'page4_expense_details', multiline: true, span: 2 },
    { kind: 'radio', label: 'Did you have Marketplace Insurance (Obama Care)?* (required)', options: ['Yes', 'No'], name: 'page4_marketplace' },
  ], { top: PAGE_H - 96 });

  // Page 5A
  page = addPageWithTitle(pdfDoc, fontBold, font, '2025 Tax Client Intake Form', 'Page 5: Business, Vehicle, and Home Office (Part 1)');
  page.drawText('****PLEASE READ CAREFULLY ****', { x: MARGIN, y: PAGE_H - 110, size: 10, font: fontBold, color: INK });
  page.drawText('(MUST ANSWER THIS QUESTION FOR FOLLOWING QUESTIONS TO APPLY)* (required)', { x: MARGIN, y: PAGE_H - 124, size: 8.8, font, color: MUTED });
  layoutItems(page, form, fontBold, font, [
    { kind: 'text', label: 'Business/ trade Activity* (required)', name: 'page5_activity' },
    { kind: 'text', label: 'Product Sold or Service Performed* (required)', name: 'page5_product' },
    { kind: 'text', label: 'Business Name * (required)', name: 'page5_business_name' },
    { kind: 'text', label: 'Business Address* (required)', name: 'page5_business_address', multiline: true },
    { kind: 'radio', label: 'Do you have a Employer Identification Number (EIN)?', options: ['Yes', 'No'], name: 'page5_ein' },
    { kind: 'text', label: 'How much did you make from your business/hobby/ trade?* (required)', name: 'page5_gross_income' },
    { kind: 'text', label: 'What proof of income can you provide?', name: 'page5_income_proof', multiline: true },
    { kind: 'radio', label: 'Did you pay anyone to work with you?', options: ['Yes', 'No'], name: 'page5_paid_helper' },
    { kind: 'text', label: 'If so how much?', name: 'page5_paid_helper_amount' },
    { kind: 'text', label: 'Advertisement* (required)', name: 'page5_advertisement' },
    { kind: 'text', label: 'Meals & Entertainment* (required)', name: 'page5_meals_entertainment' },
    { kind: 'text', label: 'Repairs & Maintenance (Ex. oil changes, tires)* (required)', name: 'page5_repairs' },
    { kind: 'text', label: 'Mortgage Interest (Business Property)* (required)', name: 'page5_mortgage_interest' },
    { kind: 'text', label: 'Commission & Fees (Contract labor)* (required)', name: 'page5_commission_fees' },
    { kind: 'text', label: 'Uniforms* (required)', name: 'page5_uniforms' },
    { kind: 'text', label: 'Supplies* (required)', name: 'page5_supplies' },
    { kind: 'text', label: 'Utilities (Light, water, gas)* (required)', name: 'page5_utilities' },
    { kind: 'text', label: 'Legal & Professional Fees* (required)', name: 'page5_legal_fees' },
    { kind: 'text', label: 'Travel (Meals Excluded)* (required)', name: 'page5_travel' },
    { kind: 'text', label: 'Real Estate Taxes * (required)', name: 'page5_real_estate_taxes' },
    { kind: 'text', label: 'Bank & Credit Card Fees* (required)', name: 'page5_bank_fees' },
    { kind: 'text', label: 'Car Insurance* (required)', name: 'page5_car_insurance' },
    { kind: 'text', label: 'Office Expenses* (required)', name: 'page5_office_expenses' },
    { kind: 'text', label: 'Car Payment Monthly * (required)', name: 'page5_car_payment' },
    { kind: 'text', label: 'Phone Bill* (required)', name: 'page5_phone_bill' },
    { kind: 'text', label: 'Health Insurance (You)* (required)', name: 'page5_health_insurance' },
    { kind: 'text', label: 'Other Expenses* (required)', name: 'page5_other_expenses' },
    { kind: 'radio', label: 'Have you taken any vehicle depreciation on this vehicle before?', options: ['Yes', 'No'], name: 'page5_vehicle_depreciation' },
    { kind: 'text', label: 'Year, Make and Model of Vehicle?* (required)', name: 'page5_vehicle_make_model' },
    { kind: 'radio', label: 'Do you have Business Mileage?', options: ['Yes', 'No'], name: 'page5_business_mileage' },
    { kind: 'text', label: 'Vehicle purchased date* (required)', name: 'page5_vehicle_purchase_date' },
    { kind: 'radio', label: 'Is the vehicle for personal and business use?', options: ['Yes', 'No'], name: 'page5_vehicle_use' },
    { kind: 'text', label: 'Date vehicle put into service for business* (required)', name: 'page5_vehicle_service_date' },
  ], { top: PAGE_H - 136 });

  // Page 5B
  page = addPageWithTitle(pdfDoc, fontBold, font, '2025 Tax Client Intake Form', 'Page 5: Business, Vehicle, and Home Office (Part 2)');
  layoutItems(page, form, fontBold, font, [
    { kind: 'text', label: 'Total miles driven for the year?* (required)', name: 'page5_total_miles' },
    { kind: 'text', label: 'Total Purchase Price of Vehicle * (required)', name: 'page5_vehicle_purchase_price' },
    { kind: 'text', label: 'Total business miles driven for the year?', name: 'page5_business_miles' },
    { kind: 'radio', label: 'Did you have a home office?', options: ['Yes', 'No'], name: 'page5_home_office' },
    { kind: 'text', label: 'What is the percentage of the space where you work within your house (Ex. 5%, 10%, 15%, 25%) * (required)', name: 'page5_home_office_pct' },
    { kind: 'text', label: 'Sq. Ft of Office', name: 'page5_office_sqft' },
    { kind: 'text', label: 'Mortgage/ Rent', name: 'page5_mortgage_rent' },
    { kind: 'text', label: 'Homeowners/ Rental Insurance', name: 'page5_home_insurance' },
    { kind: 'text', label: 'Any bad debts (Any one that owes you money that you are NOT getting back)?', name: 'page5_bad_debts', multiline: true },
    { kind: 'text', label: 'Initials', name: 'page5_initials' },
  ], { top: PAGE_H - 96 });

  // Page 6
  page = addPageWithTitle(pdfDoc, fontBold, font, '2025 Tax Client Intake Form', 'Page 6: Refund and Debt Review');
  layoutItems(page, form, fontBold, font, [
    { kind: 'checkbox', label: 'I give Mr TaxesPro permission to electronically deduct the final tax preparation fee(s) from my IRS refund.', name: 'page6_fee_deduction', boxLabel: 'I agree', span: 2 },
    { kind: 'select', label: 'How would you like your refund to be deposited when ready?* (required)', options: ['Direct deposit', 'Check', 'Debit card'], name: 'page6_refund_method' },
    { kind: 'radio', label: 'Are you interested in a Refund Advance?', options: ['Yes', 'No'], name: 'page6_refund_advance' },
    { kind: 'text', label: 'Select Refund Advance Choice', name: 'page6_refund_advance_choice' },
    { kind: 'checkbox', label: 'I have CONFIRMED, my bank account information is CORRECT. I UNDERSTAND, any errors in entering incorrect information is not the tax preparer\'s responsibility unless the information entered on the tax return is different than what is entered on this form.', name: 'page6_bank_confirm', boxLabel: 'Confirmed', span: 2 },
    { kind: 'radio', label: 'Do you have Student Loan Debts? (In Default)', options: ['Yes', 'No'], name: 'page6_student_loan' },
    { kind: 'radio', label: 'Do you have any child support debt?', options: ['Yes', 'No'], name: 'page6_child_support' },
    { kind: 'radio', label: 'Do you have any IRS debt?', options: ['Yes', 'No'], name: 'page6_irs_debt' },
    { kind: 'radio', label: 'Has your tax refund ever been taken by the IRS for owing a past due debt?', options: ['Yes', 'No'], name: 'page6_refund_taken' },
    { kind: 'radio', label: 'Do you have any other financial debt that would prevent you from getting your tax return?', options: ['Yes', 'No'], name: 'page6_other_debt' },
    { kind: 'text', label: 'Initials', name: 'page6_initials' },
    { kind: 'text', label: 'Date* (required)', name: 'page6_date' },
  ], { top: PAGE_H - 96 });

  // Page 7
  page = addPageWithTitle(pdfDoc, fontBold, font, '2025 Tax Client Intake Form', 'Page 7: Attestation and Signature');
  const attestation = [
    'We are required to verify the accuracy of the information you provide, especially for tax credits like the Earned Income Tax Credit (EITC), Child Tax Credit (CTC), and American Opportunity Credit (AOTC).',
    'You may need to submit supporting documents (e.g., proof of income, residency, or dependent relationships).',
    'By signing, you confirm that all information is truthful and complete, and you understand that incorrect details can lead to delays, adjustments, or penalties.',
    'Accuracy: Mr. Taxes Pro is not responsible for delays caused by incorrect information provided by the taxpayer (e.g., SSNs, names, birthdates, tax figures).',
    'IRS Audits: The taxpayer is responsible for providing accurate information and support if audited.',
  ];
  page.drawText('Attestation and Disclaimer', { x: MARGIN, y: PAGE_H - 110, size: 11, font: fontBold, color: INK });
  let textY = PAGE_H - 126;
  for (const line of attestation) {
    const used = drawWrapped(page, `• ${line}`, font, 9, MARGIN, textY, PAGE_W - MARGIN * 2, MUTED, 11);
    textY -= used + 2;
  }
  layoutItems(page, form, fontBold, font, [
    { kind: 'text', label: 'Taxpayer Printed Name* (required)', name: 'page7_printed_name' },
    { kind: 'text', label: 'Taxpayer Signature* (required)', name: 'page7_signature', multiline: true },
    { kind: 'text', label: 'Date* (required)', name: 'page7_date' },
  ], { top: 280, width: PAGE_W - MARGIN * 2 });

  form.updateFieldAppearances(font);
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outPath, pdfBytes);
  console.log(outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
