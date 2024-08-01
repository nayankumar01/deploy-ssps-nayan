// controllers/paymentController.js
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();
const Payment = require("../models/payment");
const StudentFeeProfile = require("../models/fees/studentFeeProfile");


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});

const handleError = (res, error, message = 'Internal Server Error', statusCode = 500) => {
    console.error(error);
    res.status(statusCode).json({ message });
};

const createOrder = async (req, res) => {


    const { amount } = req.body;

    try {
        const options = {
            amount: Number(amount * 100),
            currency: "INR",
            receipt: crypto.randomBytes(10).toString("hex"),
        };

        razorpayInstance.orders.create(options, (error, order) => {
            if (error) {
                return handleError(res, error, 'Something Went Wrong!', 500);
            }
            res.status(200).json({ data: order });
        });
    } catch (error) {
        handleError(res, error);
    }
};

const verifyPayment = async (req, res) => {


    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, studentId, receipt_no, feePaid, paymentMethod, amountPaid } = req.body;

    try {
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(sign.toString())
            .digest("hex");

        const isAuthentic = expectedSign === razorpay_signature;

        if (isAuthentic) {
            const payment = new Payment({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                studentId,
                receipt_no,
                feePaid,
                paymentMethod,
                amountPaid
            });

            const savedPayment = await payment.save();

            await StudentFeeProfile.findOneAndUpdate(
                { studentId: studentId },
                { $push: { payments: savedPayment._id } },
                { new: true }
            );

            res.json({
                success: true,
                message: "Payment Successfully Verified",
                payment: savedPayment
            });
        } else {
            res.status(400).json({ message: "Invalid Signature" });
        }
    } catch (error) {
        handleError(res, error);
    }
};

const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id).populate('studentId');
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json(payment);
    } catch (error) {
        handleError(res, error);
    }
};

const getPaymentByReceiptNumber = async (req, res) => {
    try {
        const payment = await Payment.findOne({ receipt_no: req.params.receipt_no }).populate('studentId');
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json(payment);
    } catch (error) {
        handleError(res, error);
    }
};

const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find();
        res.json(payments);
    } catch (error) {
        handleError(res, error);
    }
};

const createOfflinePayment = async (req, res) => {
    const { studentId, receipt_no, feePaid, paymentMethod, amountPaid } = req.body;

    // Validate input fields
    const requiredFields = ['studentId', 'receipt_no', 'feePaid', 'paymentMethod', 'amountPaid'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
        return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
    }

    if (!Array.isArray(feePaid) || feePaid.some(fee => typeof fee.feeType !== 'string' || typeof fee.amount !== 'number')) {
        return res.status(400).json({ message: 'feePaid must be an array of objects with feeType as string and amount as number' });
    }

    if (typeof amountPaid !== 'number') {
        return res.status(400).json({ message: 'amountPaid must be a number' });
    }

    try {
        const payment = new Payment({
            studentId,
            receipt_no,
            feePaid,
            paymentMethod,
            amountPaid
        });

        const savedPayment = await payment.save();

        await StudentFeeProfile.findOneAndUpdate(
            { studentId: studentId },
            { $push: { payments: savedPayment._id } },
            { new: true }
        );

        res.json({
            success: true,
            message: "Offline Payment Successfully Recorded",
            payment: savedPayment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



module.exports = {
    createOrder,
    verifyPayment,
    getPaymentById,
    getPaymentByReceiptNumber,
    getAllPayments,
    createOfflinePayment
};
