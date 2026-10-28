// Express 5 exposes req.query as a getter, so validated values live on req.valid.
function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    req.valid = req.valid || {};
    if (params) req.valid.params = params.parse(req.params);
    if (query) req.valid.query = query.parse(req.query);
    if (body) req.valid.body = body.parse(req.body ?? {});
    next();
  };
}

module.exports = { validate };
