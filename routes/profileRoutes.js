router.get("/public/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const profile = await Profile.findOne({ email });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.status(200).json({
      success: true,
      profile: {
        name: profile.name,
        companyName: profile.companyName,
        industry: profile.industry,
        phone: profile.phone,
        email: profile.email,
        location: profile.location,
        googleMapLocation: profile.googleMapLocation,
        businessLogo: profile.businessLogo,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load public profile",
    });
  }
});



router.get("/card/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    const profile = await Profile.findOne({ email });

    if (!profile) {
      return res.status(404).send(`
        <h2 style="font-family:Arial;text-align:center;margin-top:60px;">
          Profile not found
        </h2>
      `);
    }

    const logoHtml = profile.businessLogo
      ? `<img src="data:image/jpeg;base64,${profile.businessLogo}" class="logo" />`
      : `<div class="logo-placeholder">🏢</div>`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${profile.name} - My_Biz Card</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            background: #f4f5fa;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
          }

          .card {
            width: 90%;
            max-width: 560px;
            aspect-ratio: 1.78;
            background: linear-gradient(135deg, #1D2B7A, #4C63D2);
            border-radius: 26px;
            padding: 24px;
            color: white;
            box-shadow: 0 16px 35px rgba(0,0,0,0.22);
            box-sizing: border-box;
          }

          .top {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .logo, .logo-placeholder {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            background: white;
            object-fit: cover;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
          }

          .business {
            font-size: 22px;
            font-weight: bold;
          }

          .category {
            opacity: 0.75;
            margin-top: 4px;
          }

          .name {
            margin-top: 34px;
            font-size: 30px;
            font-weight: bold;
          }

          .info {
            margin-top: 18px;
            line-height: 1.8;
            font-size: 15px;
          }

          .btn {
            margin-top: 20px;
            display: inline-block;
            background: white;
            color: #1D2B7A;
            padding: 10px 16px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>

      <body>
        <div class="card">
          <div class="top">
            ${logoHtml}
            <div>
              <div class="business">${profile.companyName || "My Business"}</div>
              <div class="category">${profile.industry || "Business Category"}</div>
            </div>
          </div>

          <div class="name">${profile.name || "User"}</div>

          <div class="info">
            📞 ${profile.phone || ""}<br/>
            ✉️ ${profile.email || ""}<br/>
            📍 ${profile.location || ""}
          </div>

          ${
            profile.googleMapLocation
              ? `<a class="btn" href="${profile.googleMapLocation}" target="_blank">Open Location</a>`
              : ""
          }
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send("Unable to load profile card");
  }
});