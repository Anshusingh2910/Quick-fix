const emailTemplate = ({
    title = "QuickFix",
    preheader = "QuickFix - 24/7 Roadside Assistance",
    logoText = "QuickFix",
    heading,
    message,
    buttonText = "Open QuickFix",
    buttonLink = "https://quickfix.com",
    footer = "Thank you for choosing QuickFix.",
    year = new Date().getFullYear(),
}) => {
    return `
<!DOCTYPE html>
<html lang="en"
xmlns="http://www.w3.org/1999/xhtml"
xmlns:v="urn:schemas-microsoft-com:vml"
xmlns:o="urn:schemas-microsoft-com:office:office">

<head>

<meta charset="UTF-8" />

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
/>

<meta
http-equiv="X-UA-Compatible"
content="IE=edge"
/>

<meta
name="color-scheme"
content="light dark"
/>

<meta
name="supported-color-schemes"
content="light dark"
/>

<title>${title}</title>

<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->

<link
href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
rel="stylesheet"
/>

<style>

body,
table,
td{
-ms-text-size-adjust:100%;
-webkit-text-size-adjust:100%;
}

table,
td{
mso-table-lspace:0;
mso-table-rspace:0;
}

img{
border:0;
line-height:100%;
outline:none;
text-decoration:none;
}

body{
margin:0;
padding:0;
width:100%!important;
height:100%!important;
background:#f3f4f6;
font-family:'Poppins',Arial,sans-serif;
}

.logo-word{
font-family:'Poppins',Arial,sans-serif;
font-size:40px;
font-weight:700;
color:#2563eb;
}

.headline{
font-size:28px;
font-weight:700;
color:#111827;
}

@media only screen and (max-width:600px){

.email-container{
width:100%!important;
}

.fluid-padding{
padding-left:24px!important;
padding-right:24px!important;
}

.logo-word{
font-size:32px!important;
}

.headline{
font-size:22px!important;
}

.cta-btn{
width:100%!important;
text-align:center!important;
}

}

</style>

</head>

<body>

<div
style="
display:none;
font-size:1px;
line-height:1px;
max-height:0;
max-width:0;
opacity:0;
overflow:hidden;
mso-hide:all;
"
>
${preheader}
</div>

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="background:#f3f4f6;"
>

<tr>

<td
align="center"
style="padding:40px 16px;"
>

<table
role="presentation"
class="email-container"
width="600"
cellpadding="0"
cellspacing="0"
style="
width:600px;
max-width:600px;
background:#ffffff;
border-radius:12px;
overflow:hidden;
box-shadow:0 10px 25px rgba(0,0,0,.08);
"
>

<tr>

<td
align="center"
style="
background:#2563eb;
padding:40px 24px;
"
>

<div class="logo-word">
🚗 QuickFix
</div>

<p
style="
margin-top:12px;
color:#ffffff;
font-size:14px;
letter-spacing:2px;
"
>

24/7 Roadside Assistance

</p>

</td>

</tr>

<tr>

<td
style="
height:5px;
background:#f97316;
"
>

</td>

</tr>
<tr>

<td
class="fluid-padding"
style="
padding:48px;
background:#ffffff;
"
>

<h1
class="headline"
style="
margin:0 0 24px;
font-size:28px;
font-weight:700;
color:#111827;
"
>

${heading}

</h1>

<p
style="
margin:0;
font-size:16px;
line-height:28px;
color:#4b5563;
"
>

${message}

</p>

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
margin:35px 0;
background:#eff6ff;
border:1px dashed #2563eb;
border-radius:12px;
"
>

<tr>

<td
align="center"
style="
padding:30px;
"
>

<p
style="
margin:0;
font-size:15px;
color:#374151;
"
>

Your Verification Code

</p>

<h1
style="
margin:15px 0;
font-size:38px;
letter-spacing:10px;
color:#2563eb;
font-weight:700;
"
>

OTP

</h1>

<p
style="
margin:0;
font-size:14px;
color:#6b7280;
"
>

Valid for 5 minutes

</p>

</td>

</tr>

</table>

<table
role="presentation"
align="center"
cellpadding="0"
cellspacing="0"
style="margin:35px auto;"
>

<tr>

<td
align="center"
bgcolor="#2563eb"
style="border-radius:8px;"
>

<a
href="${buttonLink}"
target="_blank"
style="
display:inline-block;
padding:15px 34px;
font-size:15px;
font-weight:600;
color:#ffffff;
background:#2563eb;
text-decoration:none;
border-radius:8px;
"
>

${buttonText}

</a>

</td>

</tr>

</table>

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
margin-top:45px;
border-top:1px solid #e5e7eb;
padding-top:30px;
"
>

<tr>

<td
align="center"
width="33%"
style="
font-size:13px;
color:#6b7280;
"
>

🚗

<br><br>

24/7 Assistance

</td>

<td
align="center"
width="33%"
style="
font-size:13px;
color:#6b7280;
border-left:1px solid #e5e7eb;
border-right:1px solid #e5e7eb;
"
>

🔧

<br><br>

Verified Mechanics

</td>

<td
align="center"
width="33%"
style="
font-size:13px;
color:#6b7280;
"
>

⚡

<br><br>

Fast Response

</td>

</tr>

</table>

</td>

</tr>

<tr>

<td
align="center"
style="
background:#111827;
padding:40px 20px;
"
>

<h2
style="
margin:0;
color:#ffffff;
font-size:24px;
"
>

🚗 QuickFix

</h2>

<p
style="
margin:18px 0;
color:#d1d5db;
font-size:14px;
line-height:24px;
"
>

${footer}

</p>

<p
style="
margin:20px 0;
"
>

<a
href="https://quickfix.com/contact"
style="
color:#60a5fa;
text-decoration:none;
margin:0 10px;
"
>

Contact

</a>

|

<a
href="https://quickfix.com/about"
style="
color:#60a5fa;
text-decoration:none;
margin:0 10px;
"
>

About

</a>

|

<a
href="https://quickfix.com"
style="
color:#60a5fa;
text-decoration:none;
margin:0 10px;
"
>

Website

</a>

</p>

<p
style="
margin-top:25px;
font-size:12px;
color:#9ca3af;
"
>

© ${year} QuickFix. All Rights Reserved.

<br><br>

This is an automated email. Please do not reply.

</p>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>

`;
};

module.exports = emailTemplate;