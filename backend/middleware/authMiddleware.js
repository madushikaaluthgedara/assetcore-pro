const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'Access Denied: No Token Provided' });

    try {
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid or Expired Token' });
    }
};

module.exports = verifyToken;