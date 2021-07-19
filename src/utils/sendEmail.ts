import nodemailer from "nodemailer";

export async function sendEmail(to: string, html: string){

    //let testAccount = await nodemailer.createTestAccount();
    //console.log('testAccount', testAccount);

    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: 'fbp7nkzxp42yg4bv@ethereal.email',
            pass: 'ewW6SVSEZBmZqvuD18',
        }
    });
    

    let info = await transporter.sendMail({
        from: "Fred Foo <foo1@example.com>",
        to: to,
        subject: "Change password",
        text: html,
        html: html,
    })
    
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

}