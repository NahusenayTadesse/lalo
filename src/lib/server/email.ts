import nodemailer from 'nodemailer';

import { HOST, USER, PASSWORD, PORT } from '$env/static/private';

const transporter = nodemailer.createTransport({
	host: HOST,
	port: PORT,
	secure: true,
	auth: {
		user: USER,
		pass: PASSWORD
	}
});

export const sendEmail = async (to: string, subject: string, text: string) => {
	await transporter.sendMail({
		from: USER,
		to,
		subject,
		html
	});
};

const generateOrderTable = (items) => {
	const rows = items
		.map(
			(item) => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; text-align: left;">Product #${item.product} (${item.amount})</td>
            <td style="padding: 10px; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; text-align: right;">${item.price.toLocaleString()} ETB</td>
        </tr>
    `
		)
		.join('');

	return `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif;">
            <thead>
                <tr style="background-color: #bc3d00; color: white;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
};

export const customerCheckoutTemplate = (orderId, items, total) => ({
	subject: `Order Confirmed - Lalo Bakery Solutions (#${orderId})`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background-color: #bc3d00; padding: 20px; text-align: center;">
                <img src="https://lalobakerysolutions.com/logo192.png" alt="Lalo Bakery Logo" width="80" style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Order Confirmed!</h1>
            </div>
            <div style="padding: 20px; color: #333;">
                <p>We’ve received your order <strong>#${orderId}</strong>. Our team is now preparing your fresh selection.</p>
                ${generateOrderTable(items)}
                <div style="text-align: right; margin-top: 15px; font-weight: bold; font-size: 1.2em;">
                    Total: ${total.toLocaleString()} ETB
                </div>
            </div>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                Lalo Bakery Solutions | Quality you can taste.
            </div>
        </div>
    `
});

export const adminCheckoutTemplate = (orderId, items, total) => ({
	subject: `New Order Alert: #${orderId}`,
	html: `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #bc3d00;">New Order Received</h2>
            <p>A new order has been placed on the website. <strong>Order ID: #${orderId}</strong></p>
            ${generateOrderTable(items)}
            <p style="font-size: 18px;"><strong>Total Revenue: ${total.toLocaleString()} ETB</strong></p>
            <a href="https://your-admin-dashboard.com/orders/${orderId}"
               style="background: #bc3d00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               View in Dashboard
            </a>
        </div>
    `
});
