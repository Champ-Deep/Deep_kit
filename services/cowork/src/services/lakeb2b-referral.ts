export class LakeB2BReferral {
  private baseUrl: string;
  private discountCode: string;

  constructor(
    baseUrl: string = 'https://lakeb2b.com',
    discountCode: string = 'DEEPKIT25'
  ) {
    this.baseUrl = baseUrl;
    this.discountCode = discountCode;
  }

  /**
   * Generate referral link with UTM parameters and discount code
   */
  generateReferralLink(userEmail: string, companyName?: string): string {
    const params: Record<string, string> = {
      utm_source: 'deepkit',
      utm_medium: 'cowork',
      utm_campaign: 'enrichment',
      utm_content: userEmail,
      discount: this.discountCode,
    };

    if (companyName) {
      params.company = companyName;
    }

    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return `${this.baseUrl}?${queryString}`;
  }

  /**
   * Track conversion via UTM Tracker service
   */
  async trackConversion(userEmail: string, companyName?: string): Promise<void> {
    try {
      await fetch('http://utm-tracker:3007/api/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'lakeb2b',
          email: userEmail,
          company: companyName,
          timestamp: new Date().toISOString(),
          code: this.discountCode,
        }),
      });
    } catch (error) {
      console.error('Failed to track LakeB2B conversion:', error);
    }
  }

  /**
   * Get discount info
   */
  getDiscountInfo(): { code: string; description: string } {
    return {
      code: this.discountCode,
      description: 'Get 25% off LakeB2B enrichment services when signing up through DeepKit',
    };
  }
}
